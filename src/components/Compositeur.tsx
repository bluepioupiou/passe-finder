'use client'

import { useRouter } from 'next/navigation'
import React, { useId, useMemo, useState } from 'react'

import {
  passesDepuis,
  positionCourante,
  type ResultatEnregistrement,
  type SaisieEnchainement,
  type VuePasse,
  type VuePosition,
} from '@/composition'
import { lienEcoutable } from '@/musique'
import { correspondAuNom } from '@/recherche'
import { Bouton } from './Bouton'
import { ImagePosition } from './ImagePosition'
import './compositeur.css'

/** Au-dela de ce nombre de passes proposees, un champ de filtre apparait. */
const SEUIL_FILTRE = 8

/**
 * Une position posee dans la chaine : la bulle et son nom.
 *
 * `role` nomme les deux extremites (« Depart », « Arrivee ») : ce sont les deux
 * seules positions qu'on cherche des yeux quand la chaine s'allonge.
 */
function Etape({ position, role }: { position: VuePosition | undefined; role?: string }) {
  if (!position) return null

  return (
    <div className="compo-etape">
      <ImagePosition position={position} className="compo-etape__image" />
      <span className="compo-etape__nom">{position.nom}</span>
      {role ? <span className="compo-etape__role label-caps texte-attenue">{role}</span> : null}
    </div>
  )
}

/**
 * Compositeur d'enchainement (Stories 4.2 / 4.3) — le geste central du produit.
 *
 * POURQUOI un composant client et non des liens vers une page serveur : rien de
 * ce qui est compose ne doit pouvoir se perdre. Un enregistrement qui echoue
 * (reseau, session expiree) laisse la chaine et le texte deja saisis a l'ecran
 * (NFR-4, UX-DR16) ; ajouter une passe ne recharge pas la page, donc ne vide
 * pas le titre en cours de frappe.
 *
 * Il ne recoit PAS le catalogue mais sa projection (`VuePasse` / `VuePosition`,
 * ~10 Ko au lieu de ~130 Ko) : il n'affiche ni description ni deroule.
 *
 * La chaine construite ici est CONTINUE par construction : on ne propose que
 * les passes qui partent de la position courante (FR-10). Les ruptures de
 * l'historique (transitions de main) ne sont pas composables en v1 — elles
 * attendent l'objet Transition, cf. la note du sprint-status.
 *
 * Le rendu de la chaine est ici VERTICAL, la ou la vue lecture deroule un
 * serpentin : pendant la composition, chaque ajout doit se poser au bout sans
 * deplacer ce qui precede — un serpentin se recomposerait a chaque clic, et la
 * carte qu'on vient de poser sauterait ailleurs.
 */
export function Compositeur({
  positions,
  passes,
  dateParDefaut,
  visibilites,
  enregistrer,
}: {
  positions: VuePosition[]
  passes: VuePasse[]
  /** Jour propose par defaut (aujourd'hui), calcule par le serveur. */
  dateParDefaut: string
  /**
   * Fournies par la page (donnees simples) et non importees de la collection :
   * ce fichier partant dans le navigateur, cet import y embarquerait Payload.
   */
  visibilites: { label: string; value: string }[]
  /** Action serveur d'enregistrement, passee par la page (Story 4.3). */
  enregistrer: (saisie: SaisieEnchainement) => Promise<ResultatEnregistrement>
}) {
  const router = useRouter()

  const [depart, setDepart] = useState<number | null>(null)
  const [chaine, setChaine] = useState<VuePasse[]>([])
  const [filtre, setFiltre] = useState('')

  const [titre, setTitre] = useState('')
  const [date, setDate] = useState(dateParDefaut)
  const [description, setDescription] = useState('')
  const [musiqueTitre, setMusiqueTitre] = useState('')
  const [musiqueLien, setMusiqueLien] = useState('')
  const [notes, setNotes] = useState('')
  const [visibilite, setVisibilite] = useState(visibilites[0]?.value ?? 'prive')

  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const idDepart = useId()
  const idFiltre = useId()
  const idTitre = useId()
  const idDate = useId()
  const idDescription = useId()
  const idMusiqueTitre = useId()
  const idMusiqueLien = useId()
  const idMusiqueErreur = useId()
  const idNotes = useId()
  const idVisibilite = useId()

  const parId = useMemo(
    () => new Map(positions.map((position) => [position.id, position])),
    [positions],
  )

  // Une position d'ou aucune passe ne part ne peut rien commencer : la proposer
  // comme depart n'offrirait qu'un cul-de-sac immediat.
  const departs = useMemo(
    () => positions.filter((position) => passes.some((passe) => passe.debut === position.id)),
    [positions, passes],
  )

  const courante = positionCourante(depart, chaine)
  const possibles = useMemo(() => passesDepuis(passes, courante), [passes, courante])
  const proposees = possibles.filter((passe) => correspondAuNom(passe.nom, filtre))

  // Signale le lien inutilisable DES LA SAISIE plutot qu'au retour du serveur :
  // l'action revalide de son cote (c'est elle qui decide), mais decouvrir la
  // faute apres avoir compose vingt passes serait une punition.
  const lienInvalide = musiqueLien.trim() !== '' && lienEcoutable(musiqueLien) === null

  const ajouter = (passe: VuePasse) => {
    setChaine((precedente) => [...precedente, passe])
    // Le filtre valait pour la position qu'on vient de quitter : le garder
    // masquerait des passes possibles depuis la nouvelle.
    setFiltre('')
  }

  const annulerDerniere = () => setChaine((precedente) => precedente.slice(0, -1))

  const soumettre = async (evenement: React.FormEvent) => {
    evenement.preventDefault()
    if (enCours || chaine.length === 0 || lienInvalide) return

    setEnCours(true)
    setErreur(null)

    try {
      const resultat = await enregistrer({
        titre: titre.trim(),
        date,
        description,
        musique: { titre: musiqueTitre, lien: musiqueLien },
        notes,
        visibilite,
        passes: chaine.map((passe) => passe.id),
      })

      if (resultat.ok) {
        // On atterrit sur la fiche : la confirmation, c'est de voir son
        // enchainement. La chaine reste en etat jusqu'a la navigation, donc
        // rien n'est perdu si celle-ci echoue.
        router.push(`/enchainements/${resultat.id}`)
        return
      }

      setErreur(resultat.message)
    } catch {
      setErreur(
        "L'enregistrement n'a pas abouti (connexion ?). Ton enchaînement est toujours là : réessaie.",
      )
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form className="compo" onSubmit={soumettre}>
      <section className="compo-bloc">
        <h2 className="compo-bloc__titre">1. Position de départ</h2>

        {departs.length === 0 ? (
          <p className="texte-attenue">
            Aucune position ne porte de passe sortante : le catalogue doit être complété avant de
            pouvoir composer.
          </p>
        ) : (
          <>
            <label className="compo-label label-caps" htmlFor={idDepart}>
              D&apos;où part l&apos;enchaînement ?
            </label>
            <select
              id={idDepart}
              className="compo-saisie"
              value={depart ?? ''}
              // Verrouillee des la premiere passe : changer de depart viderait
              // la chaine sans prevenir. On annule les passes pour la rouvrir.
              disabled={chaine.length > 0}
              onChange={(evenement) =>
                setDepart(evenement.target.value === '' ? null : Number(evenement.target.value))
              }
            >
              <option value="">Choisir une position…</option>
              {departs.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.nom}
                </option>
              ))}
            </select>
            {chaine.length > 0 ? (
              <p className="compo-aide texte-attenue">
                Départ verrouillé. Retire les passes de la chaîne pour en changer.
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="compo-bloc">
        <h2 className="compo-bloc__titre">2. La chaîne</h2>

        {depart === null ? (
          <p className="texte-attenue">Choisis d&apos;abord une position de départ.</p>
        ) : (
          <>
            <ol className="compo-chaine">
              <li className="compo-chaine__item">
                <Etape position={parId.get(depart)} role="Départ" />
              </li>

              {chaine.map((passe, index) => {
                const dernier = index === chaine.length - 1

                return (
                  // L'index EST l'ordre (ADD-18), et une meme passe peut revenir
                  // dans la chaine : c'est bien le rang qui identifie le pas.
                  <li className="compo-chaine__item" key={index}>
                    <div className="compo-passe">
                      <span className="compo-passe__rang donnee texte-attenue">{index + 1}</span>
                      <span className="compo-passe__nom">{passe.nom}</span>
                      {passe.difficulte ? (
                        <span className="compo-passe__difficulte label-caps texte-attenue">
                          {passe.difficulte}
                        </span>
                      ) : null}
                      {dernier ? (
                        // Seule la DERNIERE se retire : on raccourcit pas a pas,
                        // on n'insere ni ne reordonne au milieu (FR-13).
                        <button
                          type="button"
                          className="compo-passe__retirer"
                          onClick={annulerDerniere}
                          aria-label={`Retirer « ${passe.nom} », la dernière passe`}
                          title="Retirer la dernière passe"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>

                    <Etape position={parId.get(passe.fin)} role={dernier ? 'Arrivée' : undefined} />
                  </li>
                )
              })}
            </ol>

            {chaine.length === 0 ? (
              <p className="compo-aide texte-attenue">
                Ajoute une première passe depuis la liste ci-dessous.
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="compo-bloc">
        <h2 className="compo-bloc__titre">
          3. Passes possibles
          {courante ? (
            <span className="texte-attenue"> depuis « {parId.get(courante)?.nom} »</span>
          ) : null}
        </h2>

        {courante === null ? (
          <p className="texte-attenue">La liste s&apos;ouvrira une fois le départ choisi.</p>
        ) : possibles.length === 0 ? (
          <p className="texte-attenue">
            Aucune passe ne part d&apos;ici. Enregistre l&apos;enchaînement tel quel, ou retire la
            dernière passe.
          </p>
        ) : (
          <>
            {possibles.length > SEUIL_FILTRE || filtre !== '' ? (
              <>
                <label className="compo-label label-caps" htmlFor={idFiltre}>
                  Filtrer les passes
                </label>
                <input
                  id={idFiltre}
                  type="search"
                  className="compo-saisie"
                  placeholder="Nom de la passe…"
                  value={filtre}
                  onChange={(evenement) => setFiltre(evenement.target.value)}
                />
              </>
            ) : null}

            {proposees.length === 0 ? (
              <p className="compo-aide texte-attenue">
                Rien trouvé pour « {filtre.trim()} » parmi les passes possibles d&apos;ici.
              </p>
            ) : (
              <ul className="compo-choix">
                {proposees.map((passe) => (
                  <li key={passe.id}>
                    <button
                      type="button"
                      className="compo-choix__bouton"
                      onClick={() => ajouter(passe)}
                    >
                      <span className="compo-choix__nom">{passe.nom}</span>
                      <span className="compo-choix__vers texte-attenue">
                        → {parId.get(passe.fin)?.nom}
                      </span>
                      {passe.difficulte ? (
                        <span className="compo-choix__difficulte label-caps texte-attenue">
                          {passe.difficulte}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="compo-bloc">
        <h2 className="compo-bloc__titre">4. Enregistrer</h2>

        <div className="compo-champs">
          <div className="compo-champ compo-champ--large">
            <label className="compo-label label-caps" htmlFor={idTitre}>
              Titre
            </label>
            <input
              id={idTitre}
              type="text"
              className="compo-saisie"
              required
              placeholder="Cours du mardi, passes en main droite…"
              value={titre}
              onChange={(evenement) => setTitre(evenement.target.value)}
            />
          </div>

          <div className="compo-champ">
            <label className="compo-label label-caps" htmlFor={idDate}>
              Date
            </label>
            {/* Aujourd'hui par defaut, modifiable : on note souvent le cours le
                lendemain, et un enchainement ancien se saisit a sa date. */}
            <input
              id={idDate}
              type="date"
              className="compo-saisie"
              value={date}
              onChange={(evenement) => setDate(evenement.target.value)}
            />
          </div>

          <div className="compo-champ">
            <label className="compo-label label-caps" htmlFor={idVisibilite}>
              Visibilité
            </label>
            {/* Prive en premier, donc par defaut : on ne partage jamais par
                accident (FR-17, AD-6). */}
            <select
              id={idVisibilite}
              className="compo-saisie"
              value={visibilite}
              onChange={(evenement) => setVisibilite(evenement.target.value)}
            >
              {visibilites.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="compo-champ compo-champ--large">
            <label className="compo-label label-caps" htmlFor={idDescription}>
              Description
            </label>
            <textarea
              id={idDescription}
              className="compo-saisie compo-saisie--zone"
              rows={3}
              placeholder="Ce qu'il faut retenir de l'enchaînement."
              value={description}
              onChange={(evenement) => setDescription(evenement.target.value)}
            />
          </div>

          {/* La musique appartient a l'enchainement : on danse une choregraphie
              SUR un morceau. Deux champs et non un, parce que le TITRE survit au
              lien mort — quatre des cinq musiques de l'historique pointaient
              vers des fichiers de l'ancien site, disparus avec lui. */}
          <div className="compo-champ">
            <label className="compo-label label-caps" htmlFor={idMusiqueTitre}>
              Musique
            </label>
            <input
              id={idMusiqueTitre}
              type="text"
              className="compo-saisie"
              placeholder="Gene Vincent — Be-Bop-A-Lula"
              value={musiqueTitre}
              onChange={(evenement) => setMusiqueTitre(evenement.target.value)}
            />
            <p className="compo-indice texte-attenue">
              Laisse vide et colle un lien : le titre est récupéré tout seul, quand le fournisseur
              le publie.
            </p>
          </div>

          <div className="compo-champ">
            <label className="compo-label label-caps" htmlFor={idMusiqueLien}>
              Lien de la musique
            </label>
            <input
              id={idMusiqueLien}
              type="url"
              inputMode="url"
              className="compo-saisie"
              placeholder="https://open.spotify.com/…"
              value={musiqueLien}
              onChange={(evenement) => setMusiqueLien(evenement.target.value)}
              aria-invalid={lienInvalide || undefined}
              aria-describedby={lienInvalide ? idMusiqueErreur : undefined}
            />
            {lienInvalide ? (
              <p id={idMusiqueErreur} className="compo-erreur-champ" role="alert">
                Il faut une adresse web (http:// ou https://).
              </p>
            ) : null}
          </div>

          <div className="compo-champ compo-champ--large">
            <label className="compo-label label-caps" htmlFor={idNotes}>
              Notes
            </label>
            <textarea
              id={idNotes}
              className="compo-saisie compo-saisie--zone"
              rows={3}
              placeholder="Points de vigilance, variantes…"
              value={notes}
              onChange={(evenement) => setNotes(evenement.target.value)}
            />
          </div>
        </div>

        {erreur ? (
          <p className="compo-erreur" role="alert">
            {erreur}
          </p>
        ) : null}

        <div className="compo-actions">
          <Bouton type="submit" disabled={enCours || chaine.length === 0 || lienInvalide}>
            {enCours ? 'Enregistrement…' : "Enregistrer l'enchaînement"}
          </Bouton>

          <p className="compo-aide texte-attenue" role="status" aria-live="polite">
            {lienInvalide
              ? 'Corrige le lien de la musique pour pouvoir enregistrer.'
              : chaine.length === 0
                ? 'Ajoute au moins une passe pour pouvoir enregistrer.'
                : `${chaine.length} passe${chaine.length > 1 ? 's' : ''} dans la chaîne.`}
          </p>
        </div>
      </section>
    </form>
  )
}
