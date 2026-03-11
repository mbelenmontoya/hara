// Hará UI v2 - Narrative Kitchen Sink
// Design system showcase with consistent spacing rhythm

'use client'

import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Chip } from '../components/ui/Chip'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'

export default function UIPage() {
  const [showSuccess, setShowSuccess] = useState(false)

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="bg-surface border-b border-outline sticky top-0 z-10">
        <div className="container-public py-4">
          <h1 className="text-2xl font-semibold text-foreground">Hará UI v2</h1>
          <p className="text-sm text-muted mt-1">Sistema de diseño · Foundations</p>
        </div>
      </div>

      <div className="container-public">
        {/* Section 1: Foundations */}
        <section className="section-public">
          <h2 className="text-xl font-semibold text-foreground mb-6">Tipografía y color</h2>

          <Card className="mb-4">
            <CardContent>
              <div className="stack-default">
                <h1 className="text-3xl font-semibold">Encuentra tu terapeuta ideal</h1>
                <h2 className="text-2xl font-semibold">Recomendaciones personalizadas</h2>
                <p className="text-base text-foreground leading-relaxed">
                  Texto principal legible en Manrope con espaciado cómodo para lectura móvil.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Texto secundario para metadatos e información complementaria.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Color palette */}
          <Card>
            <CardContent>
              <p className="text-sm font-medium text-foreground mb-4">Paleta de colores</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="h-14 bg-brand rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-xs text-white font-medium">#4B2BBF</span>
                  </div>
                  <p className="text-xs text-muted">Brand</p>
                </div>
                <div>
                  <div className="h-14 bg-success rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-xs text-white font-medium">#2F8A73</span>
                  </div>
                  <p className="text-xs text-muted">Success (teal)</p>
                </div>
                <div>
                  <div className="h-14 bg-warning rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-xs text-white font-medium">#F2A43A</span>
                  </div>
                  <p className="text-xs text-muted">Warning (apricot)</p>
                </div>
                <div>
                  <div className="h-14 bg-info rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-xs text-white font-medium">#7B61D9</span>
                  </div>
                  <p className="text-xs text-muted">Info (lavender)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 2: Componentes */}
        <section className="section-public">
          <h2 className="text-xl font-semibold text-foreground mb-6">Componentes</h2>

          <Card className="mb-4">
            <CardContent>
              <div className="stack-default">
                <Button variant="primary" className="w-full" onClick={() => setShowSuccess(!showSuccess)}>
                  Ver recomendaciones
                </Button>
                <Button variant="secondary" className="w-full">
                  Editar perfil
                </Button>
                <Button variant="ghost" className="w-full">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>

          {showSuccess && (
            <Alert variant="success" title="Operación exitosa" className="mb-4">
              Los cambios se guardaron correctamente.
            </Alert>
          )}

          <Card className="mb-4">
            <CardContent>
              <p className="text-sm font-medium text-foreground mb-4">Chips</p>
              <div className="flex flex-wrap gap-2">
                <Chip label="Perfil revisado" variant="success" />
                <Chip label="Turnos esta semana" variant="warning" />
                <Chip label="Online" variant="neutral" />
                <Chip label="Recomendado" variant="brand" />
                <Chip label="Nuevo" variant="info" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="stack-default">
                <Input
                  label="Nombre completo"
                  placeholder="Ej: María González"
                  helper="Como aparecerá en tu perfil"
                />
                <Select label="Especialidad">
                  <option value="">Selecciona una opción</option>
                  <option value="anxiety">Ansiedad</option>
                  <option value="depression">Depresión</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Ejemplos reales */}
        <section className="section-public">
          <h2 className="text-xl font-semibold text-foreground mb-6">Ejemplos en contexto</h2>

          {/* Professional recommendation */}
          <Card className="mb-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-subtle rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground mb-1">Dra. Ana García</h4>
                <p className="text-sm text-muted mb-2">Psicóloga clínica · Ansiedad</p>
                <Badge variant="matched">Recomendación #1</Badge>
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-4">
              Especialista en terapia cognitivo-conductual con amplia experiencia en ansiedad y estrés.
            </p>
            <Button variant="primary" className="w-full">
              Contactar por WhatsApp
            </Button>
          </Card>

          {/* Admin lead row */}
          <Card className="mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="font-semibold text-foreground">maria@email.com</span>
                  <Badge variant="new">Nuevo</Badge>
                </div>
                <div className="text-sm text-muted space-x-2">
                  <span>Argentina</span>
                  <span className="text-outline">•</span>
                  <span>Ansiedad</span>
                </div>
              </div>
              <Button variant="primary" size="sm">
                Crear match
              </Button>
            </div>
          </Card>

          <Alert variant="success" title="Match creado">
            El lead recibirá las recomendaciones por email.
          </Alert>
        </section>

        {/* Section 4: Estados especiales */}
        <section className="section-public">
          <h2 className="text-xl font-semibold text-foreground mb-6">Estados especiales</h2>

          <Card className="mb-4">
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="No hay leads pendientes"
              description="Todos los leads han sido procesados. Los nuevos aparecerán aquí."
            />
          </Card>

          <Alert variant="error" title="Error al procesar">
            No pudimos completar la operación. Intenta nuevamente o contacta a soporte.
          </Alert>
        </section>

        {/* Footer */}
        <div className="pt-12 text-center border-t border-outline">
          <p className="text-sm text-muted">
            Hará UI v2 · Diseño mobile-first
          </p>
        </div>
      </div>
    </div>
  )
}
