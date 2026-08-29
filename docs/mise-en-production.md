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

Sur la machine tournent **trois conteneurs** :

| Conteneur | Rôle |
| --- | --- |
| **app** | Passe Finder (Next.js + Payload) |
| **caddy** | reverse proxy : sert le site en HTTPS, certificat gratuit et auto-renouvelé |
| **litestream** | réplique en continu la base SQLite vers S3 (sauvegarde) |

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

## Étape 2 — Bucket S3 (sauvegarde de la base)

C'est ce qui garantit qu'une panne de la machine ne te fait rien perdre.

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

Pour générer le `PAYLOAD_SECRET` :

```bash
openssl rand -base64 32
```

> ⚠️ Le `PAYLOAD_SECRET` de production doit être **différent** de celui de ton
> `.env` local. S'il change après coup, toutes les sessions ouvertes sont
> invalidées (les gens doivent se reconnecter) — sans perte de données.

---

## Étape 9 — Premier déploiement

Une fois les huit étapes faites, pousse un commit sur `v2`. Le pipeline fait le
reste. Suis-le dans l'onglet **Actions** de GitHub.

Au bout de quelques minutes : `https://ton-domaine.fr`

---

## Étape 10 — (rien à faire)

**L'import du catalogue est automatique.** Au démarrage, le conteneur enchaîne :

1. migrations Payload (schéma de la base) ;
2. bascule en mode WAL (nécessaire à la sauvegarde) ;
3. **import du catalogue historique — uniquement si la base est vide**.

Ce garde-fou est important : sans lui, une position que tu supprimerais depuis
le back-office **réapparaîtrait** au déploiement suivant. En n'important que sur
une base vide, on obtient zéro geste manuel au premier déploiement et aucune
résurrection de contenu supprimé ensuite.

L'import reste rejouable à la demande si besoin :

```bash
sudo docker compose exec app npm run migrate:all
```

## Limite connue : les images téléversées

Les images vivent sur un **volume Docker** de la machine. Elles survivent aux
redéploiements et aux redémarrages, mais **ne sont pas répliquées vers S3** —
seule la base de données l'est.

Conséquence concrète : si la machine était perdue, il faudrait rejouer
`npm run migrate:all` pour réimporter les images depuis le dépôt. Tes 30
positions historiques sont donc couvertes ; en revanche, une image que tu
ajouterais *ensuite* depuis le back-office serait perdue.

L'architecture prévoit à terme de stocker les images dans S3 (AD-11), ce qui
réglerait ce point. C'est un travail distinct, à planifier quand tu commenceras
à enrichir le catalogue depuis l'interface.

## Et après ?

- **Créer ton compte admin** : va sur `https://ton-domaine.fr/admin`, l'assistant
  de premier utilisateur t'attend.
- **Vérifier la sauvegarde** : le bucket S3 doit se remplir dans les minutes qui
  suivent le premier démarrage.
- **Tester la restauration** au moins une fois — une sauvegarde jamais testée
  n'est pas une sauvegarde.

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
