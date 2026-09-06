import Link from 'next/link'
import React from 'react'

import { LegendeCouple, LegendeDanseurs } from '@/components/LegendeSchema'
import { COURRIEL_CONTACT } from '@/components/PiedDePage'
import './comment-ca-marche.css'

export const metadata = {
  title: 'Comment ça marche ? — Passe Finder',
  description:
    'Pourquoi ce site existe, à quelles questions il répond, et comment lire les schémas de position.',
}

/**
 * « Comment ça marche ? » — la page qui explique le site.
 *
 * ELLE EST BATIE SUR LES QUESTIONS DES ELEVES, pas sur les fonctionnalites du
 * produit. « À partir d'ici, je peux faire quoi ? », « comment j'arrive dans
 * cette position ? », « on avait fait quoi il y a trois semaines ? » : ce sont
 * les phrases entendues en cours, et chacune ouvre sur l'ecran qui y repond.
 * Un texte qui aurait plutot annonce « un catalogue, un compositeur et des
 * enchainements partageables » se serait lu une fois, puis referme.
 *
 * ELLE N'EST PAS DANS LA BARRE DE NAVIGATION (decision d'Alain). Deux portes
 * suffisent, et aucune n'ajoute d'entree de menu : le pied de page, present
 * partout, et une phrase dans l'introduction de l'accueil. Les fiches position
 * pointent en plus directement sur la legende, la ou la question se pose.
 *
 * PAS DE FEUILLE DE ROUTE, non plus par decision : on dit que le site bouge
 * sans cesse et qu'on ecoute, on ne promet pas de dates a des eleves.
 *
 * PAGE STATIQUE : aucune lecture de base, aucune session. C'est la seule page
 * publique du site a ne pas avoir besoin de `force-dynamic`.
 */
export default function CommentCaMarche() {
  return (
    <div className="contenu-page page-explication">
      <h1>Comment ça marche ?</h1>

      <p className="explication-chapeau">
        Passe Finder est né des questions qu’on se pose au milieu d’un cours de rock 6 temps, quand
        la musique s’arrête et que plus personne ne se souvient de la suite.
      </p>

      <section className="explication-section" aria-labelledby="titre-questions">
        <h2 id="titre-questions">Les trois questions du cours</h2>

        <div className="explication-question">
          <h3>« À partir d’ici, qu’est-ce que je peux faire ? »</h3>
          <p>
            Chaque position a sa fiche, et cette fiche liste toutes les passes qui en partent. Vous
            choisissez la position où vous êtes, vous lisez ce qui s’ouvre devant vous.{' '}
            <Link href="/positions">Voir les positions</Link>.
          </p>
        </div>

        <div className="explication-question">
          <h3>« Comment j’arrive dans cette position ? »</h3>
          <p>
            La même fiche répond dans l’autre sens : elle liste aussi toutes les passes qui
            aboutissent ici. C’est la même question, lue à l’envers.
          </p>
        </div>

        <div className="explication-question">
          <h3>« On avait fait quoi comme enchaînement, il y a trois semaines ? »</h3>
          <p>
            Les enchaînements du cours sont écrits et gardés, du plus ancien au plus récent. Rien ne
            se perd entre deux séances.{' '}
            <Link href="/enchainements">Voir les enchaînements</Link>.
          </p>
        </div>
      </section>

      <section className="explication-section" aria-labelledby="titre-preparer">
        <h2 id="titre-preparer">Préparer et partager un enchaînement</h2>
        <p>
          Le site sert aussi à préparer un cours. On part d’une position, et à chaque étape il ne
          propose que les passes réellement possibles depuis l’endroit où l’on se trouve : un
          enchaînement construit ici est dansable.
        </p>
        <p>
          Une fois enregistré, il tient dans un lien, qui se colle dans un message et s’ouvre sans
          compte. Lire le site ne demande jamais de s’inscrire. Composer et garder ses enchaînements,
          oui.
        </p>
      </section>

      {/*
        L'ANCRE `#schemas` EST UNE ADRESSE PUBLIQUE : les fiches position
        pointent dessus. La renommer casserait ces liens.
      */}
      <section className="explication-section" id="schemas" aria-labelledby="titre-schemas">
        <h2 id="titre-schemas">Comment lire un schéma ?</h2>
        <p>
          Les positions sont dessinées <strong>vues de dessus</strong>, comme si on regardait le
          couple depuis le plafond. Il ne reste alors que le dessus des têtes, les bras et les mains.
        </p>

        <LegendeDanseurs />

        <p>
          Les deux repères ne se ressemblent pas, et c’est normal : la banane du cavalier est devant
          lui, la queue de cheval de la cavalière est derrière elle. Chacun regarde donc du côté de
          son repère, ou à l’opposé.
        </p>

        <h3>Le couple, pièce par pièce</h3>

        <LegendeCouple />
      </section>

      <section className="explication-section" aria-labelledby="titre-evolution">
        <h2 id="titre-evolution">Le site n’est pas fini</h2>
        <p>
          Il change en permanence, et il changera encore. Les positions, les passes et les
          enchaînements s’ajoutent au fil des cours, et les écrans se corrigent au fur et à mesure
          qu’on s’en sert.
        </p>
        <p>
          Beaucoup de ce qui existe ici vient d’une remarque faite en cours ou d’un message. Si
          quelque chose vous manque, vous gêne, ou vous paraît faux, n’hésitez pas :{' '}
          <a href={`mailto:${COURRIEL_CONTACT}?subject=Passe%20Finder`}>écrivez-le</a>. Une idée mal
          formulée vaut mieux qu’une idée gardée.
        </p>
      </section>
    </div>
  )
}
