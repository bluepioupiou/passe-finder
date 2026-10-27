import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { AffichagePasse } from '@/components/AffichagePasse'

/**
 * La bascule « Simple | Rythme » de la fiche passe (Story 8.3).
 *
 * LE PIEGE A COUVRIR : une passe sans position intermediaire doit rester
 * EXACTEMENT la fiche d'avant — pas de bascule qui ne menerait a rien.
 */

afterEach(cleanup)

const simple = <p>départ → arrivée</p>
const rythme = <p>la frise</p>

describe('AffichagePasse', () => {
  it('sans frise, montre la fiche simple et aucune bascule', () => {
    render(<AffichagePasse simple={simple} rythme={null} />)
    expect(screen.getByText('départ → arrivée')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('ouvre sur « Simple », puis bascule sur « Rythme » et revient', () => {
    render(<AffichagePasse simple={simple} rythme={rythme} />)

    const boutonSimple = screen.getByRole('button', { name: 'Simple' })
    const boutonRythme = screen.getByRole('button', { name: 'Rythme' })
    expect(boutonSimple.getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('la frise')).toBeNull()

    fireEvent.click(boutonRythme)
    expect(boutonRythme.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('la frise')).toBeTruthy()
    expect(screen.queryByText('départ → arrivée')).toBeNull()

    fireEvent.click(boutonSimple)
    expect(screen.getByText('départ → arrivée')).toBeTruthy()
  })
})
