import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { CarteEnchainement } from '@/components/CarteEnchainement'
import { nomAuteur, nomsDesAuteurs } from '@/auteurs'
import { chargerCatalogue } from '@/catalogue'
import config from '@/payload.config'
import { exigerSession } from '@/porte'
import { lireParIdentifiantsPublics } from '@/lecture-enchainement'
import '../enchainements/enchainements.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mes favoris — Passe Finder',
}

/**
 * Mes favoris (Story 5.1 ; premiere des deux listes de E7, Story 5.2).
 *
 * Reservee, donc passee par `exigerSession` (Story 3.5) : un anonyme est emmene
 * vers la connexion et revient ici. La liste « mes enchainements » viendra
 * completer ce profil a la Story 5.2.
 *
 * LES FAVORIS SONT LUS EN PREMIER, puis les enchainements correspondants. On
 * pourrait charger la relation en profondeur 1 et s'epargner une requete, mais
 * la visibilite doit etre relue : un enchainement que son auteur a repasse en
 * prive depuis la mise en favori ne doit plus apparaitre ici. La seconde
 * lecture est ce qui garantit cette fraicheur.
 *
 * ELLE PASSE PAR LE LIEN QUE LE FAVORI A GARDE, et non par les `access` de la
 * collection. La raison tient au modele de visibilite : un NON REPERTORIE
 * n'existe, pour `access.read`, que pour son auteur — c'est ce qui le tient
 * hors des listes et de l'API. Un favori pose dessus disparaitrait donc en
 * silence de cette page. Le favori conserve le lien recu, cette page le rejoue,
 * et `peutLire` tranche a nouveau : ce qu'on rejoue est une adresse, pas un
 * droit acquis (voir `src/visibilite.ts`).
 */
export default async function MesFavoris() {
  const utilisateur = await exigerSession('/favoris')

  const payload = await getPayload({ config: await config })

  const { docs: favoris } = await payload.find({
    collection: 'favoris',
    where: { utilisateur: { equals: utilisateur.id } },
    limit: 500,
    depth: 0,
    sort: '-createdAt',
    overrideAccess: false,
    user: utilisateur,
  })

  // Les liens recus, du plus recemment mis de cote au plus ancien : c'est la
  // chronologie de MA mise de cote qui fait sens ici, pas la date des
  // enchainements. `lireParIdentifiantsPublics` conserve cet ordre.
  const liens = favoris
    .map((favori) => favori.idPublic)
    .filter((lien): lien is string => typeof lien === 'string')

  const [ordonnes, catalogue] = await Promise.all([
    lireParIdentifiantsPublics(payload, liens, utilisateur),
    chargerCatalogue(payload),
  ])

  const auteurs = await nomsDesAuteurs(payload, ordonnes)

  return (
    <div className="contenu-page">
      <header className="enchainements-entete">
        <h1>Mes favoris</h1>
        <p className="texte-attenue">
          {ordonnes.length === 0
            ? 'Rien pour le moment.'
            : `${ordonnes.length} enchaînement${ordonnes.length > 1 ? 's' : ''} mis de côté.`}
        </p>
      </header>

      {ordonnes.length === 0 ? (
        // Etat vide accueillant, qui dit le geste a faire (UX-DR15).
        <p className="texte-attenue">
          Pas encore de favori. Ouvre un <Link href="/enchainements">enchaînement partagé</Link> et
          mets-le en signet pour le retrouver ici.
        </p>
      ) : (
        <ul className="enchainements-grille">
          {ordonnes.map((enchainement) => (
            <li key={enchainement.id}>
              <CarteEnchainement
                enchainement={enchainement}
                catalogue={catalogue}
                auteur={nomAuteur(enchainement, auteurs)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
