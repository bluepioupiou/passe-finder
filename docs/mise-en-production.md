# Mise en production — guide pas à pas

Ce document décrit **ce que tu dois créer toi-même** (compte AWS, machine, clés)
et **ce qui est déjà automatisé**. Il est écrit pour quelqu'un qui découvre AWS :
chaque étape explique le *pourquoi*, pas seulement le *comment*.

> ⚠️ **Aucun secret ne doit m'être transmis ni écrit dans le dépôt.** Les clés et
> mots de passe se saisissent directement dans la console AWS ou dans les
> *secrets* GitHub, qui sont chiffrés.

---

## Vue d'ensemble

Une fois tout en place, voici ce qui se passera à chaque `git push` :

```
ton commit
   └─> GitHub Actions : types, lint, tests
        └─> construit l'image Docker
             └─> test de fumée contre le conteneur
                  └─> publie l'image sur ghcr.io
                       └─> se connecte en SSH à ta machine Lightsail
                            └─> récupère l'image et redémarre le site
```

Sur la machine tournent **quatre conteneurs** :

| Conteneur | Rôle |
| --- | --- |
| **app** | Passe Finder (Next.js + Payload) |
| **caddy** | reverse proxy : sert le site en HTTPS, certificat gratuit et auto-renouvelé |
| **litestream** | réplique en continu la base SQLite vers S3 (sauvegarde) |
| **sauvegarde-medias** | copie les images téléversées vers le même bucket, une fois par heure |

---

## Étape 1 — Compte AWS

1. Va sur https://aws.amazon.com et crée un compte (carte bancaire demandée, même
   pour le gratuit — c'est le fonctionnement normal d'AWS).
2. Active l'authentification à deux facteurs sur le compte racine. Ce compte a
   tous les droits : il faut le protéger.

### Choisir sa région

Un compte AWS n'est **pas** rattaché à une région : tu choisis la région au
moment de créer *chaque* ressource, via le sélecteur en haut à droite de la
console.

N'importe quelle région européenne convient — `eu-west-3` (Paris) ou
`eu-north-1` (Stockholm) par exemple. Les données restent dans l'UE dans les
deux cas, et l'écart de latence depuis la France (~20-30 ms) est imperceptible
ici.

**La seule règle qui compte : garde la même région pour tout** (instance
Lightsail *et* bucket S3). Des ressources dispersées compliquent la
configuration sans rien apporter.

#### Si Lightsail affiche « Region restricted »

Lightsail gère **sa propre liste de régions**, distincte du reste d'AWS.
Certaines sont désactivées par défaut (*opt-in Regions*). Le message
« Access to this Region has been restricted from the Console » signifie
simplement que la région n'est pas encore activée pour Lightsail.

Deux solutions :

1. **Choisir une région déjà disponible** — le plus simple, et sans
   inconvénient : toutes les régions européennes se valent pour ce projet.
2. **Activer la région voulue** (gratuit) : console Lightsail → ton utilisateur
   (en haut à droite) → *Account* → onglet *Profile* → section *Supported
   opt-in Regions* → *Start opt-in*. Le statut passe de *Enabling* à *Enabled*
   en quelques minutes. Tu ne paies que les ressources créées dans la région.

### Free Plan ou Paid Plan — le point à ne pas rater

Depuis juillet 2025, un compte AWS neuf démarre sur un **Free Plan**, qui donne
des crédits mais **restreint les services accessibles**. Deux conséquences
directes pour ce projet :

1. **Lightsail n'est pas disponible sur le Free Plan.** Tenter de l'utiliser
   donne des erreurs de type « not authorized … explicit deny in a service
   control policy » — c'est AWS qui restreint, pas une erreur de ta part.
2. **Un compte Free Plan est fermé automatiquement** au bout de 6 mois (ou à
   épuisement des crédits) s'il n'est pas basculé en Paid Plan. Impensable pour
   un site destiné à durer.

**Il faut donc passer en Paid Plan.** Ce que cela change :

| | Free Plan | Paid Plan |
| --- | --- | --- |
| Crédits déjà acquis | conservés | **conservés** |
| Lightsail | non | **oui** |
| À épuisement des crédits | compte **fermé** | compte actif, facturation normale |

Passer en Paid Plan ne déclenche **aucun paiement immédiat** : les crédits
s'appliquent d'abord.

### Activer les fonctionnalités avancées (indispensable pour Lightsail)

Passer en Paid Plan **ne suffit pas**. Lightsail figure dans la liste des
services « non pris en charge par la nouvelle expérience AWS », aux côtés
d'AWS Organizations, IAM Identity Center ou IAM Access Analyzer.

Il faut donc **activer les fonctionnalités avancées** :
https://docs.aws.amazon.com/accounts/latest/reference/activate-advanced-features.html

**Pourquoi Lightsail est-il classé « avancé » ?** La justification d'AWS (« pas
nécessaire aux nouveaux développeurs ») ne colle pas : c'est leur produit
d'entrée de gamme. Le vrai critère est ailleurs — la liste regroupe les services
disposant de **leur propre console et de leur propre modèle de facturation**,
qu'AWS n'a pas câblés dans la nouvelle expérience simplifiée. Lightsail facture
au forfait, hors du modèle standard : d'où son exclusion.

C'est d'ailleurs la même cause qui provoque l'erreur
`access-analyzer:ValidatePolicy … explicit deny` lors de la création d'une
politique IAM : IAM Access Analyzer figure dans la même liste.

⚠️ **Cette activation est vraisemblablement définitive.** Les bascules
équivalentes chez AWS (Organizations « all features », migrations assistées) ne
sont pas réversibles. Lis l'avertissement affiché sur la page avant de
confirmer. Ce n'est pas un problème ici : tu rejoins l'expérience AWS classique,
plus complète et mieux documentée. **L'activation elle-même est gratuite.**

### Garde-fou de facturation (à faire tout de suite)

Dès le passage en Paid Plan, pose une alerte — c'est ce qui évite les mauvaises
surprises :

**Billing and Cost Management → Budgets → Create budget** → budget mensuel de
10 $, alerte par e-mail à 80 %.

Cela ne bloque rien, mais te prévient avant toute dérive.

### Crédits promotionnels

Si ton compte dispose de crédits AWS, vérifie-les dans **Billing and Cost
Management → Credits**. Deux informations à relever :

- la **date d'expiration** (les crédits expirent souvent au bout de 12 mois) ;
- les **services éligibles** — certains crédits excluent des services, et
  Lightsail est parfois traité à part. La page de tes crédits indique les
  restrictions applicables.

À titre d'ordre de grandeur : 100 $ de crédits couvriraient environ 18 mois de
l'instance à 5 $/mois.

---

## Étape 2 — Bucket S3 (sauvegarde de la base et des images)

C'est ce qui garantit qu'une panne de la machine ne te fait rien perdre.
Un **seul bucket** accueille les deux sauvegardes, dans deux dossiers séparés :
`passe-finder/` pour la base, `medias/` pour les images.

1. Console AWS → **S3** → *Create bucket*.
2. Nom : quelque chose d'unique, ex. `passe-finder-sauvegarde-<un-suffixe>`.
   (Les noms de buckets sont uniques au monde entier.)
3. Région : **la même que celle choisie à l'étape 1**.
4. Laisse **« Block all public access » COCHÉ** — tes sauvegardes ne doivent
   jamais être publiques.
5. Crée le bucket.

**Coût** : quelques centimes par mois pour ce volume de données.

---

## Étape 3 — Utilisateur IAM (droit d'écrire dans le bucket)

Le conteneur de sauvegarde a besoin d'un accès au bucket — mais **uniquement**
à celui-là, et rien d'autre. C'est le principe du moindre privilège.

1. Console AWS → **IAM** → *Users* → *Create user*.
2. Nom : `passe-finder-litestream`. **Ne coche pas** l'accès à la console.
3. *Attach policies directly* → *Create policy* → onglet **JSON**, et colle ceci
   en remplaçant `TON-BUCKET` par le nom choisi à l'étape 2 :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::TON-BUCKET"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::TON-BUCKET/*"
    }
  ]
}
```

4. Nomme la politique `passe-finder-sauvegarde`, crée-la, puis rattache-la à
   l'utilisateur.

> Cette politique couvre **tout le bucket** : les mêmes clés servent à la
> sauvegarde de la base (Litestream) et à celle des images. Rien à ajouter
> côté AWS pour les images.
5. Une fois l'utilisateur créé : *Security credentials* → *Create access key* →
   choisis **Application running outside AWS**.
6. **Note les deux valeurs** (`Access key ID` et `Secret access key`). La clé
   secrète ne s'affiche **qu'une seule fois**.

---

## Étape 4 — Instance Lightsail (la machine)

1. Console AWS → **Lightsail** → *Create instance*.
2. Région : **la même que celle du bucket S3**.
3. Plateforme : **Linux/Unix** → *OS Only* → **Ubuntu 24.04 LTS**.
4. Type de réseau : **Dual-stack** (inclut une IPv4 publique). Surtout pas
   *IPv6-only*.
5. Formule : **$7/mois — 1 Go de mémoire**, minimum viable.
   - ⚠️ **Évite la formule à $5 : elle n'a que 512 Mo.** Ubuntu (~180 Mo) +
     Next.js/Payload (~300-400 Mo) + Caddy et Litestream (~40 Mo) dépassent déjà
     ce budget : le noyau finirait par tuer l'application, avec un site qui
     redémarre en boucle sans message explicite.
   - La formule à $12 (2 Go) est plus confortable mais double la facture.
   - Un **fichier d'échange de 2 Go** est créé par `bootstrap.sh` : c'est ce qui
     rend le 1 Go raisonnable.
   - Lightsail permet de redimensionner plus tard (via un instantané).
6. Nom : `passe-finder`.
7. Crée l'instance et attends qu'elle soit *Running*.

### 4a — IP statique (indispensable)

Sans cela, l'adresse de ta machine change à chaque redémarrage — et ton nom de
domaine pointerait dans le vide.

1. Onglet **Networking** → *Create static IP*.
2. Rattache-la à l'instance `passe-finder`.
3. **Note cette adresse IP.**

> Une IP statique est **gratuite tant qu'elle est rattachée** à une instance
> active. Détachée, elle devient payante — donc ne la laisse jamais orpheline.

### 4b — Ouvrir les ports

Onglet **Networking** de l'instance → *IPv4 Firewall*. Vérifie la présence de :

| Application | Protocole | Port |
| --- | --- | --- |
| SSH | TCP | 22 |
| HTTP | TCP | 80 |
| HTTPS | TCP | 443 |

Ajoute HTTP et HTTPS s'ils manquent.

---

## Étape 5 — Nom de domaine

### 5a — Acheter le domaine

| Registrar | Prix indicatif | Remarque |
| --- | --- | --- |
| OVH / Gandi | ~10-15 €/an | français, interface en français |
| Cloudflare Registrar | au prix coûtant | le moins cher, mais impose son DNS |
| AWS Route 53 | 12 $/an + ~6 $/an de zone hébergée | tout reste dans AWS (intérêt pédagogique) |

> ⚠️ **Deux points après l'achat, quel que soit le registrar :**
> 1. **Confirme l'e-mail de vérification.** Sans ce clic, le domaine peut être
>    suspendu — c'est la cause n°1 de « mon domaine ne marche pas ».
> 2. Route 53 crée automatiquement une **zone hébergée** avec des
>    enregistrements `NS` et `SOA`. **N'y touche pas** : ils font fonctionner le
>    domaine. Ajoute seulement les deux `A` ci-dessous.

Aucun de ces choix n'est mauvais. Route 53 ajoute un service managé AWS à
manipuler ; OVH et Gandi coûtent un peu moins cher.

### 5b — Créer les enregistrements DNS

Dans la zone DNS du domaine :

| Type | Nom | Valeur | TTL |
| --- | --- | --- | --- |
| `A` | `@` (ou vide) | l'IP statique de l'étape 4a | **300** |
| `A` | `www` | la même IP | **300** |

**Les deux enregistrements sont nécessaires** : la configuration Caddy demande un
certificat pour le domaine nu *et* pour `www`. S'il en manque un, l'obtention du
certificat échoue.

**TTL court (300 s) au départ** : une erreur de saisie se corrige alors en
5 minutes au lieu de plusieurs heures. À augmenter une fois tout stabilisé.

### 5c — Vérifier AVANT de déployer

> ⚠️ **Ne lance pas le déploiement tant que le DNS ne résout pas.**
> Caddy demanderait le certificat, Let's Encrypt refuserait, et après quelques
> échecs tu serais **temporairement bloqué par leurs limites de débit** — parfois
> plusieurs heures d'attente forcée.

```bash
nslookup ton-domaine.fr
nslookup www.ton-domaine.fr
```

Les deux doivent renvoyer l'IP statique de l'instance. La propagation prend de
quelques minutes à quelques heures selon le registrar.

Une fois que c'est bon, Caddy obtient et renouvelle le certificat tout seul :
ni certbot, ni tâche planifiée de renouvellement.

## Étape 6 — Clé SSH pour le déploiement automatique

GitHub Actions doit pouvoir se connecter à la machine. On lui donne une clé
**dédiée**, séparée de ta clé personnelle.

Sur **ta machine Windows**, dans un terminal :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/passe-finder-deploy -C "github-actions" -N ""
```

Cela crée deux fichiers :
- `passe-finder-deploy` → la clé **privée** (secrète, pour GitHub)
- `passe-finder-deploy.pub` → la clé **publique** (à installer sur le serveur)

### Installer la clé publique sur le serveur

1. Dans Lightsail, ouvre la console SSH du navigateur (bouton *Connect using SSH*).
2. Colle le contenu de `passe-finder-deploy.pub` dans le fichier des clés
   autorisées :

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "COLLE-ICI-LE-CONTENU-DU-FICHIER-.pub" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## Étape 7 — (rien à faire)

**La préparation du serveur est automatique.** Le job de déploiement envoie et
exécute `deploy/bootstrap.sh` à chaque passage : installation de Docker,
création du fichier d'échange, des dossiers, et activation du démarrage
automatique. Le script est idempotent — sans effet si tout est déjà en place.

Tu n'as donc rien à lancer à la main sur la machine.

## Étape 8 — Secrets GitHub

Dépôt GitHub → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*.

| Nom du secret | Valeur | D'où ça vient |
| --- | --- | --- |
| `SSH_HOTE` | l'IP statique | étape 4a |
| `SSH_UTILISATEUR` | `ubuntu` | utilisateur par défaut d'Ubuntu sur Lightsail |
| `SSH_CLE_PRIVEE` | contenu **entier** du fichier `passe-finder-deploy` | étape 6 |
| `PAYLOAD_SECRET` | une valeur aléatoire longue | voir ci-dessous |
| `DOMAINE` | ton domaine, ex. `passe-finder.fr` | étape 5 |
| `AWS_ACCESS_KEY_ID` | la clé d'accès | étape 3 |
| `AWS_SECRET_ACCESS_KEY` | la clé secrète | étape 3 |
| `S3_BUCKET` | le nom du bucket | étape 2 |
| `S3_REGION` | la région, ex. `eu-north-1` | étape 2 |
| `CLOUDFLARE_ANALYTICS_TOKEN` | le jeton de mesure d'audience | **facultatif**, voir ci-dessous |
| `ADMIN_EMAIL` | ton email de connexion au site | **facultatif**, voir « Devenir administrateur » |

Pour générer le `PAYLOAD_SECRET` :

```bash
openssl rand -base64 32
```

> ⚠️ Le `PAYLOAD_SECRET` de production doit être **différent** de celui de ton
> `.env` local. S'il change après coup, toutes les sessions ouvertes sont
> invalidées (les gens doivent se reconnecter) — sans perte de données.

### Le jeton Cloudflare (facultatif)

`CLOUDFLARE_ANALYTICS_TOKEN` sert à compter les visiteurs. **Tu peux déployer
sans lui** : le site fonctionne exactement pareil, il n'est simplement pas
mesuré, et il n'appelle alors aucun service extérieur.

Pour l'obtenir : [dash.cloudflare.com](https://dash.cloudflare.com) → **Web
Analytics** → *Add a site* → ton domaine. Ton domaine n'a **pas** besoin d'être
géré par Cloudflare : notre installation pose le script à la main. Cloudflare
affiche ensuite un extrait de code ; le jeton est la valeur de `token` à
l'intérieur, une longue suite de caractères. C'est elle seule qu'on met dans le
secret, pas l'extrait entier.

> Cette mesure ne pose **aucun cookie** et ne suit personne individuellement.
> C'est pour cela que le site n'a pas besoin de bandeau de consentement.

---

## Étape 9 — Premier déploiement

Une fois les huit étapes faites, pousse un commit sur `v2`. Le pipeline fait le
reste. Suis-le dans l'onglet **Actions** de GitHub.

Au bout de quelques minutes : `https://ton-domaine.fr`

---

## Étape 10 — Reprise du catalogue historique (geste manuel, une seule fois)

Au démarrage, le conteneur enchaîne deux choses seulement :

1. migrations Payload (schéma de la base) ;
2. bascule en mode WAL (nécessaire à la sauvegarde).

**La reprise des données historiques n'est PAS automatique** (décision du
2026-08-30). C'est un geste d'initialisation, fait une fois par entité, puis
plus jamais. L'automatiser au démarrage supposait un garde-fou « la base
est-elle vide ? » : une heuristique tout-ou-rien, incapable de voir qu'une
entité manque alors que les autres sont déjà là — ce qui est précisément arrivé
quand les enchaînements sont arrivés après les positions et les passes.

Les scripts restent embarqués dans l'image et sont **rejouables sans risque**
(dédoublonnage par `legacyId` : relancer ne crée aucun doublon).

### Comment lancer un import en production

Sur le serveur, dans `/opt/passe-finder` :

```bash
sudo docker compose exec app npm run migrate:enchainements
```

Le script écrit son rapport (créés / déjà présents / comptage source vs cible)
dans la sortie de la commande. Un second passage doit afficher `Crees : 0`.

**Les enchaînements ont besoin d'un auteur** (les comptes historiques ne sont
pas repris — FR-36). S'il y a plusieurs utilisateurs en base, le script refuse
de deviner et réclame l'email du propriétaire :

```bash
sudo docker compose exec -e MIGRATION_AUTEUR_EMAIL=ton.email@exemple.fr app npm run migrate:enchainements
```

Les autres scripts s'appellent de la même façon : `migrate:positions`,
`migrate:passes`, ou `migrate:all` pour les trois dans l'ordre de dépendance.

> Avant un import, vérifie que Litestream réplique bien (section suivante) :
> c'est le filet qui permet de revenir en arrière si l'import ne donne pas ce
> que tu attendais.

## Vérifier que la sauvegarde fonctionne

Une sauvegarde qu'on n'a jamais vue tourner n'est pas une sauvegarde. Après le
premier déploiement :

1. **Ouvre le bucket S3** — un dossier `passe-finder` doit apparaître en
   quelques minutes.
2. **Regarde les journaux** :

```bash
sudo docker compose logs litestream --tail=20
```

Tu dois y lire `snapshot complete`, `ltx file uploaded` puis des `replica sync`
réguliers. Toute ligne `level=ERROR` signale un problème.

3. **Vérifie aussi la sauvegarde des images** :

```bash
sudo docker compose logs sauvegarde-medias --tail=20
```

Au démarrage, une première copie part immédiatement, puis une par heure. Un
dossier `medias` doit apparaître dans le bucket à côté de `passe-finder`.

Pour lister ce qui est réellement sauvegardé :

```bash
sudo docker compose exec sauvegarde-medias rclone ls "s3:$S3_BUCKET/medias"
```

### Panne rencontrée : « attempt to write a readonly database »

Symptôme : le bucket reste vide, et les journaux répètent
`create _litestream_seq table: attempt to write a readonly database (8)`.

Cause : l'image Litestream tourne en utilisateur `nonroot`, alors que le volume
`/data` appartient à l'uid 1001 de l'application. Litestream **v0.5 écrit** dans
la base (contrairement aux versions 0.3), il lui faut donc les droits d'écriture.

Correctif, déjà appliqué dans `deploy/docker-compose.yml` :

```yaml
  litestream:
    user: '1001:1001'
```

## Ce qui est sauvegardé, et comment

Deux mécanismes distincts, un seul bucket :

| Donnée | Mécanisme | Fréquence | Perte possible |
| --- | --- | --- | --- |
| Base SQLite (`/data`) | Litestream, dossier `passe-finder/` | continue | quelques secondes |
| Images téléversées (`/app/media`) | `rclone copy`, dossier `medias/` | toutes les heures | jusqu'à 1 h |

**Pourquoi `copy` et pas `sync`** : `rclone copy` n'efface jamais côté S3. Une
image supprimée par erreur depuis le back-office reste donc récupérable dans le
bucket. C'est ce qui fait la différence entre une *sauvegarde* et une simple
copie distante — cette dernière propagerait la suppression.

**Rien à changer côté AWS** : la politique IAM de l'étape 3 autorise déjà la
lecture et l'écriture sur l'ensemble du bucket. Le conteneur de sauvegarde des
images réutilise les mêmes clés que Litestream.

**La contrepartie à connaître** : la base est répliquée à la seconde, les images
avec jusqu'à une heure de retard. Si la machine disparaissait juste après un
ajout, tu retrouverais une position dont l'image manque — à re-téléverser
depuis le back-office. Vu la fréquence à laquelle tu ajoutes des images, c'est
un prix assumé plutôt qu'un oubli. Pour raccourcir ce délai, change
`INTERVALLE_SAUVEGARDE` dans `deploy/docker-compose.yml`.

## Pourquoi une livraison ne perd jamais de données

C'est la question qui revient à chaque déploiement. La réponse tient dans les
**volumes Docker nommés** : `donnees` (la base) et `medias` (les images) sont
déclarés à part des conteneurs. Une livraison détruit et recrée le conteneur
`app` — mais les volumes, eux, sont simplement rattachés au nouveau conteneur.
Les données ne vivent jamais dans l'image Docker, qui est jetable (AD-10).

Trois garde-fous complètent ça :

1. **Migrations incrémentales** — `payload migrate` ne rejoue que les migrations
   pas encore appliquées (Payload tient une table `payload_migrations`). Le
   schéma évolue, les données restent.
2. **Aucun import automatique** — le démarrage ne touche pas aux données : il
   n'applique que le schéma. Une position supprimée depuis le back-office ne
   peut donc pas ressusciter à la livraison suivante. Les reprises de données
   sont des gestes manuels, tracés (étape 10).
3. **Litestream tourne pendant tout ça**, avec 30 jours d'historique. Même une
   migration qui abîmerait des données est rattrapable : Litestream sait
   restaurer à un instant précis, pas seulement au dernier état.

> ⚠️ La seule commande qui détruirait tout est `docker compose down -v` : le
> `-v` supprime les volumes. Le déploiement utilise `up -d --remove-orphans`,
> qui n'y touche jamais. À ne pas taper à la main sur le serveur.

## Repartir de zéro après une perte totale

Scénario : la machine est perdue (panne, suppression, compte fermé). Tout ce qui
compte est dans S3 ; le reste se reconstruit tout seul.

1. **Crée une nouvelle instance** (étape 4) et repointe le DNS vers sa nouvelle
   IP statique (étape 5b).
2. **Mets à jour le secret `SSH_HOTE`** dans GitHub avec cette IP, et installe
   la clé publique de déploiement sur la nouvelle machine (étape 6).
3. **Lance un déploiement** (pousse un commit, ou relance le dernier workflow
   depuis l'onglet *Actions*). Il prépare la machine et démarre la pile.
4. **Restaure** — c'est l'étape qui rapatrie tes données :

```bash
sudo sh /opt/passe-finder/restaurer.sh
```

Le script arrête la pile, efface la base fraîchement créée, la restaure depuis
Litestream, recopie les images depuis le bucket, puis redémarre tout.

**Pourquoi effacer la base créée au démarrage** : au premier lancement sur une
machine vierge, l'application voit une base vide et importe le catalogue
historique. Sans cette étape, tu repartirais des 30 positions d'origine au lieu
de ton état réel. Le script s'en charge — c'est justement sa raison d'être.

### Tester la restauration (recommandé)

Une sauvegarde jamais restaurée n'est pas une sauvegarde. Le test le plus
honnête consiste à créer une **seconde instance jetable**, y dérouler la
procédure ci-dessus, vérifier que le site revient avec tes données, puis
supprimer l'instance. Quelques centimes, et tu sais.

Version courte, sans deuxième machine — restaurer la base **à côté** de la base
en service, sans y toucher :

```bash
sudo docker compose run --rm --no-deps litestream restore -config /etc/litestream.yml -o /data/verification.db /data/passe-finder.db
```

Si la commande se termine sans erreur, la sauvegarde de la base est exploitable.
Supprime ensuite le fichier de vérification :

```bash
sudo docker run --rm -v "$(sudo docker volume ls -q | grep _donnees$)":/data alpine:3 rm -f /data/verification.db
```

## Et après ?

- **Créer ton compte** : va sur `https://ton-domaine.fr/admin`, l'assistant
  de premier utilisateur t'attend. Attention : créer le compte ne suffit pas à
  te rendre administrateur, voir juste en dessous.
- **Vérifier la sauvegarde** : le bucket S3 doit se remplir dans les minutes qui
  suivent le premier démarrage.
- **Tester la restauration** au moins une fois — une sauvegarde jamais testée
  n'est pas une sauvegarde.

## Devenir administrateur

Créer un compte ne donne **aucun** droit sur le catalogue. Le drapeau `admin`
— qui autorise à éditer danses, positions, passes et fichiers — ne peut pas
s'attribuer depuis l'application : personne ne peut se promouvoir soi-même, et
c'est volontaire (story 3.4). Sans cette règle, le premier inscrit venu
pourrait réécrire le catalogue dont dépendent les enchaînements de tes élèves.

Il faut donc une porte extérieure, et c'est le secret `ADMIN_EMAIL` :

1. crée ton compte sur `https://ton-domaine.fr/admin` ;
2. ajoute le secret GitHub `ADMIN_EMAIL` avec **cet email exactement** ;
3. relance le déploiement (un `push` sur `main`, ou *Re-run jobs*).

Au démarrage, le conteneur pose le drapeau sur ce compte et l'écrit dans ses
logs. La variable est **idempotente** : elle ne fait plus rien ensuite, et tu
peux la laisser en place.

Pour vérifier :

```bash
sudo docker compose logs app | grep -i administrateur
```

> Tant qu'aucun compte ne porte le drapeau, le démarrage affiche un
> avertissement et le catalogue reste en **lecture seule** pour tout le monde.
> Le site fonctionne normalement par ailleurs : les visiteurs consultent, les
> comptes connectés composent leurs enchaînements.

Une fois un premier administrateur en place, il peut en désigner d'autres en
cochant la case depuis `/admin` — sans toucher au déploiement.

## Récapitulatif des coûts

| Poste | Coût |
| --- | --- |
| Instance Lightsail $7 (1 Go) | ~77 €/an |
| IP statique | gratuite tant qu'attachée |
| Bucket S3 | quelques centimes/mois |
| Nom de domaine `.fr` (Route 53) | 12 $/an |
| Zone hébergée Route 53 | ~6 $/an (0,50 $/mois) |
| GitHub Actions + ghcr.io | gratuit (dépôt public) |
| **Total** | **~93 €/an** |

À comparer à la référence de ~50 €/an du PRD : on est **presque au double**.
Il faut l'assumer clairement plutôt que de le minimiser.

D'où vient l'écart :

| Poste | Écart | Pouvait-on faire autrement ? |
| --- | --- | --- |
| Instance à 7 $ au lieu de 5 $ | +22 €/an | **Non.** 512 Mo ne suffisent pas à faire tourner Next.js + Payload. |
| Domaine + zone hébergée | +16 €/an | Oui, mais au prix d'une URL en IP brute, sans HTTPS — inacceptable pour un lien partagé dans WhatsApp. |

Autrement dit, la référence de 50 €/an du PRD était **optimiste** : elle
supposait la formule la moins chère et aucun nom de domaine. Le coût réel d'un
site utilisable se situe autour de 90 €/an, soit **~7,50 €/mois**.

Deux atténuations : les **crédits AWS** couvrent environ les 14 premiers mois, et
un registrar externe (OVH, Gandi) ferait économiser la zone hébergée si le coût
devenait un sujet.
