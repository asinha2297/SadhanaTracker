import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Ring } from './Ring'

const progressStroke = (percent: number) => {
  const { container } = render(<Ring percent={percent} label="Japa" caption="rounds" />)
  return container.querySelectorAll('circle')[1]?.getAttribute('class') ?? ''
}

describe('Ring', () => {
  it('draws progress in marigold and a completed ring in tulasi green', () => {
    expect(progressStroke(60)).toContain('stroke-saffron')
    expect(progressStroke(100)).toContain('stroke-tulasi')
  })
})
