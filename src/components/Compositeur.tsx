'use client'

import { useRouter } from 'next/navigation'
import React, { useId, useMemo, useState } from 'react'

import {
  passesDepuis,
  positionCourante,
  transitionsUtiles,
  type EtatCompose,
  type MaillonCompose,
  type ResultatEnregistrement,
  type SaisieEnchainement,
  type SaisieMetadonnees,
  type VuePasse,
  type VuePosition,
  type VueTransition,
} from '@/composition'
import { correspondAuNom } from '@/recherche'
import { ChampsEnchainement, auMoinsUnLienInvalide } from './ChampsEnchainement'
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
 * Un changement de prise pose dans la chaine (Story 4.7).
 *
 * Il n'a NI RANG NI CARTE, contrairement a une passe, et c'est le point : une
 * transition ne prend pas de temps musical, ce n'est pas un pas de plus. Une
 * ligne discrete marquee « ↻ » entre deux passes, et la position vers laquelle
 * on repart — le meme vocabulaire que la vue lecture, qui superpose les deux
 * bulles.
 *
 * `nom` peut manquer si la transition a ete retiree du catalogue entre-temps :
 * on montre alors le changement sans le nommer, plutot que de faire disparaitre
 * un pas que l'utilisateur vient de poser.
 */
function Reprise({
  nom,
  position,
  role,
  surRetrait,
}: {
  nom: string | undefined
  position: VuePosition | undefined
  role?: string
  /** Fourni seulement pour le changement en attente, qui est l'action annulable. */
  surRetrait?: () => void
}) {
  return (
    <>
      <div className="compo-reprise">
        <span className="compo-reprise__marque" aria-hidden="true">
          ↻
        </span>
        <span className="compo-reprise__nom">{nom ?? 'Changement de prise'}</span>
        {surRetrait ? (
          <button
            type="button"
            className="compo-passe__retirer"
            onClick={surRetrait}
            aria-label={`Annuler « ${nom ?? 'Changement de prise'} »`}
            title="Annuler le changement de prise"
          >
            ×
          </button>
        ) : null}
      </div>

      <Etape position={position} role={role} />
    </>
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
 * La chaine construite ici est JUSTIFIEE par construction (FR-10, FR-45) : on
 * ne propose que les passes qui partent de la position courante, et les seuls
 * changements de prise proposes sont des transitions DECLAREES. Elle n'est donc
 * plus forcement continue au sens du graphe — mais chaque discontinuite qu'elle
 * produit s'appuie sur une arete du catalogue, jamais sur un saut libre.
 *
 * Le rendu de la chaine est ici VERTICAL, la ou la vue lecture deroule un
 * serpentin : pendant la composition, chaque ajout doit se poser au bout sans
 * deplacer ce qui precede — un serpentin se recomposerait a chaque clic, et la
 * carte qu'on vient de poser sauterait ailleurs.
 *
 * LE MEME COMPOSANT SERT A COMPOSER ET A REPRENDRE (Story 4.5). Avec `initial`,
 * il s'ouvre sur un enchainement existant : meme chaine, memes regles, meme
 * bouton. Un second ecran de recomposition aurait double la surface a maintenir
 * pour un geste identique — et l'AC de la story demande justement que
 * « Editer » rouvre LE compositeur, pas un cousin.
 *
 * CE QUI CHANGE EN REPRISE, ET C'EST TOUT : le libelle du bouton, un lien
 * « Annuler » vers la fiche, et le fait que la chaine ne parte pas de zero.
 * Les regles de composition sont identiques — on prolonge par la fin, on
 * raccourcit pas a pas, on n'insere pas au milieu (FR-13, FR-15).
 */
export function Compositeur({
  positions,
  passes,
  transitions,
  dateParDefaut,
  visibilites,
  enregistrer,
  initial,
  retour,
}: {
  positions: VuePosition[]
  passes: VuePasse[]
  /** Les changements de prise declares (Story 4.7). */
  transitions: VueTransition[]
  /** Jour propose par defaut (aujourd'hui), calcule par le serveur. */
  dateParDefaut: string
  /**
   * Fournies par la page (donnees simples) et non importees de la collection :
   * ce fichier partant dans le navigateur, cet import y embarquerait Payload.
   */
  visibilites: { label: string; value: string }[]
  /**
   * Action serveur d'enregistrement, passee par la page : creation (Story 4.3)
   * ou mise a jour (Story 4.5). Le compositeur ne sait pas laquelle des deux —
   * il compose et il envoie.
   */
  enregistrer: (saisie: SaisieEnchainement) => Promise<ResultatEnregistrement>
  /**
   * Enchainement a REPRENDRE : sa chaine et ses informations (Story 4.5).
   * Absent, on compose un nouvel enchainement.
   */
  initial?: EtatCompose & { informations: SaisieMetadonnees }
  /** Ou mene « Annuler ». Absent, aucun bouton d'annulation n'est propose. */
  retour?: string
}) {
  const router = useRouter()

  /** Reprise d'un existant, ou page blanche ? Change les libelles, rien d'autre. */
  const reprise = initial !== undefined

  const [depart, setDepart] = useState<number | null>(initial?.depart ?? null)
  const [chaine, setChaine] = useState<MaillonCompose[]>(initial?.chaine ?? [])
  // Le changement de prise choisi mais pas encore consomme par une passe. Il
  // deplace la position courante, donc il fait partie de l'etat compose — voir
  // `positionCourante`, a qui on le passe explicitement.
  const [transitionEnAttente, setTransitionEnAttente] = useState<number | null>(null)
  const [filtre, setFiltre] = useState('')

  // Les informations tiennent en UN objet plutot qu'en six etats : c'est la
  // forme que `ChampsEnchainement` attend, et celle que l'enregistrement
  // envoie. Un seul endroit ou ajouter un champ, le jour ou il y en aura un de
  // plus.
  const [informations, setInformations] = useState<SaisieMetadonnees>(
    () =>
      initial?.informations ?? {
        titre: '',
        date: dateParDefaut,
        description: '',
        musique: { titre: '', lien: '' },
        video: '',
        notes: '',
        // Prive en premier dans la liste, donc par defaut : on ne partage jamais
        // par accident (FR-17, AD-6).
        visibilite: visibilites[0]?.value ?? 'prive',
      },
  )

  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const idDepart = useId()
  const idFiltre = useId()

  const parId = useMemo(
    () => new Map(positions.map((position) => [position.id, position])),
    [positions],
  )

  // Les transitions par TRAJET, comme la lecture les retrouve : la chaine ne
  // retient que la position vers laquelle on a change de prise, jamais quelle
  // transition on a cliquee. Une seule facon de renommer une reprise, ici comme
  // dans `construireChaine`.
  const parTrajet = useMemo(
    () =>
      new Map(
        transitions.map((transition) => [`${transition.debut}>${transition.fin}`, transition]),
      ),
    [transitions],
  )

  // Une position d'ou aucune passe ne part ne peut rien commencer : la proposer
  // comme depart n'offrirait qu'un cul-de-sac immediat.
  //
  // SAUF LE DEPART D'UN ENCHAINEMENT REPRIS (Story 4.5), qu'on rajoute meme
  // s'il ne mene plus nulle part : le catalogue a pu bouger depuis, et un
  // `select` dont la valeur ne correspond a aucune option s'afficherait VIDE —
  // rouvrir un enchainement pour changer son titre donnerait l'impression
  // d'avoir perdu son point de depart.
  const departs = useMemo(() => {
    const utiles = positions.filter((position) => passes.some((passe) => passe.debut === position.id))
    if (depart === null || utiles.some((position) => position.id === depart)) return utiles

    const actuelle = positions.find((position) => position.id === depart)
    return actuelle ? [actuelle, ...utiles] : utiles
  }, [positions, passes, depart])

  const courante = positionCourante(depart, chaine, transitionEnAttente)
  const possibles = useMemo(() => passesDepuis(passes, courante), [passes, courante])
  const proposees = possibles.filter((passe) => correspondAuNom(passe.nom, filtre))

  // Les changements de prise restent ANCRES SUR L'ARRIVEE DE LA DERNIERE PASSE,
  // pas sur la position courante. Deux consequences voulues : on peut changer
  // d'avis (recliquer une autre transition remplace la precedente), mais on ne
  // peut pas enchainer deux transitions d'affilee — ce que l'historique ne fait
  // jamais, et qui reviendrait a se deplacer librement dans le graphe.
  const arrivee = positionCourante(depart, chaine)
  const changements = useMemo(
    () => transitionsUtiles(transitions, passes, arrivee),
    [transitions, passes, arrivee],
  )

  // Signale le lien inutilisable DES LA SAISIE plutot qu'au retour du serveur :
  // l'action revalide de son cote (c'est elle qui decide), mais decouvrir la
  // faute apres avoir compose vingt passes serait une punition.
  const lienInvalide = auMoinsUnLienInvalide(informations)

  const ajouter = (passe: VuePasse) => {
    // La passe CONSOMME le changement de prise en attente : il devient sa
    // transition d'entree, et la chaine redevient la seule source de la
    // position courante.
    setChaine((precedente) => [...precedente, { passe, transitionAvant: transitionEnAttente }])
    setTransitionEnAttente(null)
    // Le filtre valait pour la position qu'on vient de quitter : le garder
    // masquerait des passes possibles depuis la nouvelle.
    setFiltre('')
  }

  const changerDePrise = (transition: VueTransition) => {
    setTransitionEnAttente(transition.fin)
    setFiltre('')
  }

  /**
   * Defait exactement la DERNIERE ACTION, et il y en a maintenant deux sortes.
   *
   * Un changement de prise en attente s'annule seul : la passe precedente reste
   * posee. Sinon on retire la derniere passe, et son changement de prise
   * REDEVIENT en attente — sans quoi retirer une passe effacerait au passage un
   * choix qu'on n'avait pas demande a defaire, et il faudrait le refaire pour
   * essayer une autre passe depuis la meme prise.
   */
  const annulerDernier = () => {
    if (transitionEnAttente !== null) {
      setTransitionEnAttente(null)
      setFiltre('')
      return
    }

    const dernier = chaine[chaine.length - 1]
    if (!dernier) return

    setChaine((precedente) => precedente.slice(0, -1))
    setTransitionEnAttente(dernier.transitionAvant)
    setFiltre('')
  }

  /**
   * Un changement de prise en attente EMPECHE l'enregistrement.
   *
   * Pas par principe, par honnetete : seules les passes sont stockees, et la
   * reprise se rededuit du couple (arrivee, depart suivant). Un changement qui
   * n'est suivi d'aucune passe n'a donc rien pour survivre — l'enregistrer le
   * ferait disparaitre en silence. On le dit, plutot que de le perdre.
   */
  const repriseInachevee = transitionEnAttente !== null

  const soumettre = async (evenement: React.FormEvent) => {
    evenement.preventDefault()
    if (enCours || chaine.length === 0 || lienInvalide || repriseInachevee) return

    setEnCours(true)
    setErreur(null)

    try {
      const resultat = await enregistrer({
        ...informations,
        titre: informations.titre.trim(),
        // SEULES LES PASSES SONT ENVOYEES : une transition ne prend pas de
        // temps musical, donc elle n'est pas un maillon. La lecture la
        // rededuira du couple (arrivee, depart suivant) — voir `construireChaine`.
        passes: chaine.map((maillon) => maillon.passe.id),
      })

      if (resultat.ok) {
        // On atterrit sur la fiche : la confirmation, c'est de voir son
        // enchainement. La chaine reste en etat jusqu'a la navigation, donc
        // rien n'est perdu si celle-ci echoue.
        router.push(`/enchainements/${resultat.idPublic}`)
        // `refresh` force la relecture cote serveur : en REPRISE, la fiche
        // pourrait sinon se rouvrir depuis le cache du routeur, telle qu'elle
        // etait AVANT la modification qu'on vient d'enregistrer.
        router.refresh()
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

              {chaine.map((maillon, index) => {
                const { passe } = maillon
                // Le pas retirable n'est la derniere passe que si aucun
                // changement de prise n'attend derriere elle : sinon la
                // derniere action, c'est le changement, et c'est lui qui porte
                // son propre bouton plus bas.
                const dernier = index === chaine.length - 1
                const retirable = dernier && transitionEnAttente === null
                const precedente = index > 0 ? chaine[index - 1].passe.fin : depart

                return (
                  // L'index EST l'ordre (ADD-18), et une meme passe peut revenir
                  // dans la chaine : c'est bien le rang qui identifie le pas.
                  <li className="compo-chaine__item" key={index}>
                    {maillon.transitionAvant !== null ? (
                      <Reprise
                        nom={parTrajet.get(`${precedente}>${maillon.transitionAvant}`)?.nom}
                        position={parId.get(maillon.transitionAvant)}
                      />
                    ) : null}

                    <div className="compo-passe">
                      <span className="compo-passe__rang donnee texte-attenue">{index + 1}</span>
                      <span className="compo-passe__nom">{passe.nom}</span>
                      {passe.difficulte ? (
                        <span className="compo-passe__difficulte label-caps texte-attenue">
                          {passe.difficulte}
                        </span>
                      ) : null}
                      {retirable ? (
                        // Seule la DERNIERE se retire : on raccourcit pas a pas,
                        // on n'insere ni ne reordonne au milieu (FR-13).
                        <button
                          type="button"
                          className="compo-passe__retirer"
                          onClick={annulerDernier}
                          aria-label={`Retirer « ${passe.nom} », la dernière passe`}
                          title="Retirer la dernière passe"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>

                    <Etape
                      position={parId.get(passe.fin)}
                      role={dernier && transitionEnAttente === null ? 'Arrivée' : undefined}
                    />
                  </li>
                )
              })}

              {transitionEnAttente !== null ? (
                // Le changement de prise deja choisi, en attente de la passe qui
                // le consommera. Il vit dans la CHAINE et non dans la liste des
                // propositions : c'est deja un pas de l'enchainement, la seule
                // chose qui lui manque est la suite.
                <li className="compo-chaine__item">
                  <Reprise
                    nom={parTrajet.get(`${arrivee}>${transitionEnAttente}`)?.nom}
                    position={parId.get(transitionEnAttente)}
                    role="Arrivée"
                    surRetrait={annulerDernier}
                  />
                </li>
              ) : null}
            </ol>

            {chaine.length === 0 && transitionEnAttente === null ? (
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
            Aucune passe ne part d&apos;ici.{' '}
            {changements.length > 0
              ? 'Change de prise ci-dessous pour rouvrir le catalogue, enregistre l’enchaînement tel quel, ou retire la dernière passe.'
              : 'Enregistre l’enchaînement tel quel, ou retire la dernière passe.'}
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

      {/*
        Les changements de prise viennent APRES les passes, et c'est un ordre de
        priorite : ce qu'on cherche d'abord, c'est la passe suivante. Le
        changement de prise est le recours — quand rien de ce qu'on veut ne part
        d'ici, ou quand on est arrive dans un cul-de-sac.
      */}
      {changements.length > 0 ? (
        <section className="compo-bloc">
          <h2 className="compo-bloc__titre">
            Changer de prise
            {arrivee !== null ? (
              <span className="texte-attenue"> depuis « {parId.get(arrivee)?.nom} »</span>
            ) : null}
          </h2>

          <p className="compo-aide texte-attenue">
            Sans danser de passe : on change de prise à la fin de la précédente, et la liste des
            passes possibles se rouvre depuis la nouvelle position.
          </p>

          <ul className="compo-choix">
            {changements.map((transition) => {
              const choisie = transitionEnAttente === transition.fin

              return (
                <li key={`${transition.debut}>${transition.fin}`}>
                  <button
                    type="button"
                    className="compo-choix__bouton compo-choix__bouton--reprise"
                    // Recliquer la transition deja choisie l'annule : le meme
                    // bouton fait et defait, sans avoir a viser la croix.
                    onClick={() => (choisie ? annulerDernier() : changerDePrise(transition))}
                    aria-pressed={choisie}
                  >
                    <span className="compo-choix__nom">
                      <span className="compo-reprise__marque" aria-hidden="true">
                        ↻
                      </span>{' '}
                      {transition.nom}
                    </span>
                    <span className="compo-choix__vers texte-attenue">
                      → {parId.get(transition.fin)?.nom}
                    </span>
                    {transition.description ? (
                      <span className="compo-choix__deroule texte-attenue">
                        {transition.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section className="compo-bloc">
        <h2 className="compo-bloc__titre">4. Enregistrer</h2>

        <ChampsEnchainement
          valeurs={informations}
          surChangement={(partiel) =>
            setInformations((precedentes) => ({ ...precedentes, ...partiel }))
          }
          visibilites={visibilites}
        />

        {erreur ? (
          <p className="compo-erreur" role="alert">
            {erreur}
          </p>
        ) : null}

        <div className="compo-actions">
          <Bouton
            type="submit"
            disabled={enCours || chaine.length === 0 || lienInvalide || repriseInachevee}
          >
            {enCours
              ? 'Enregistrement…'
              : reprise
                ? 'Enregistrer les modifications'
                : "Enregistrer l'enchaînement"}
          </Bouton>

          {/* Annuler est un LIEN, pas un bouton : il ne fait rien d'autre que
              retourner d'ou l'on vient. */}
          {retour ? (
            <Bouton variante="fantome" href={retour}>
              Annuler
            </Bouton>
          ) : null}

          <p className="compo-aide texte-attenue" role="status" aria-live="polite">
            {lienInvalide
              ? 'Corrige le lien de la musique pour pouvoir enregistrer.'
              : chaine.length === 0
                ? 'Ajoute au moins une passe pour pouvoir enregistrer.'
                : repriseInachevee
                  ? 'Termine le changement de prise par une passe, ou annule-le : seul, il ne serait pas enregistré.'
                  : `${chaine.length} passe${chaine.length > 1 ? 's' : ''} dans la chaîne.`}
          </p>
        </div>
      </section>
    </form>
  )
}
