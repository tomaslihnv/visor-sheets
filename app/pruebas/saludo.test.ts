import { describe, expect, it } from 'vitest'
import { nombreDe, saludo } from '../src/ui/saludo'

const a = (h: number) => new Date(2026, 10, 9, h)
const todos = (h: number) => Array.from({ length: 40 }, (_, i) => saludo('Ana', a(h), i / 40))

describe('saludo de bienvenida', () => {
  it('respeta la hora: sin "buenos días" de noche ni "buenas noches" de mañana', () => {
    expect(todos(9).some((s) => /noches|tarde/i.test(s))).toBe(false)
    expect(todos(22).some((s) => /días|Buenas tardes/i.test(s))).toBe(false)
    expect(todos(15).every((s) => s.includes('Ana'))).toBe(true)
  })
  it('usa el nombre de pila y, si no hay, el correo', () => {
    expect(nombreDe({ displayName: 'José Vargas', email: 'jose@situ.cl' })).toBe('José')
    expect(nombreDe({ displayName: null, email: 'jose.vargas@situ.cl' })).toBe('jose.vargas')
  })
})
