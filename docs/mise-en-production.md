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

1. Achète un domaine chez le registrar de ton choix (OVH, Gandi, Namecheap…),
   ~12 €/an. AWS Route 53 fonctionne aussi mais coûte un peu plus.
2. Dans la zone DNS du domaine, crée un enregistrement :

| Type | Nom | Valeur |
| --- | --- | --- |
| `A` | `@` (ou vide) | l'IP statique de l'étape 4a |
| `A` | `www` | la même IP |

3. La propagation prend de quelques minutes à quelques heures.

> Le certificat HTTPS est obtenu **automatiquement** par Caddy au premier
> démarrage, une fois que le domaine pointe vers l'IP. Rien à faire de plus.

---

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

## Étape 7 — Préparer le serveur

Toujours dans la console SSH de Lightsail :

```bash
curl -fsSL https://raw.githubusercontent.com/bluepioupiou/passe-finder/v2/deploy/bootstrap.sh | bash
```

Ce script installe Docker, crée les dossiers nécessaires et prépare
l'arborescence. Il est **idempotent** : le relancer ne casse rien.

---

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

## Étape 10 — Importer ton catalogue en production

La base de production démarre **vide**. Deux options :

**A. Rejouer la migration sur le serveur** *(recommandé)* — le dump legacy est
dans le dépôt, donc l'import est reproductible :

```bash
docker compose exec app npm run migrate:all
```

**B. Transférer ta base locale** — à préférer si tu as fait des modifications
dans le back-office local que tu veux conserver.

---

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
| Nom de domaine | ~12 €/an |
| GitHub Actions + ghcr.io | gratuit (dépôt public) |
| **Total** | **~90 €/an** |

À comparer à la référence de ~50 €/an du PRD : on est légèrement au-dessus,
essentiellement à cause du nom de domaine. Sans domaine (IP brute, sans HTTPS)
on serait à ~55 €/an, mais l'expérience pour tes élèves serait dégradée.
