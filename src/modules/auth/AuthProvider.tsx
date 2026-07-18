import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  abmelden as abmeldenApi,
  aufSessionWechselHoeren,
  eigenenPartnerLaden,
  sessionLaden,
} from './api'
import { Kontext, type AuthKontext } from './kontext'
import { hatMindestensRolle, type Partner } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [laedt, setLaedt] = useState(true)

  const neuLaden = useCallback(async () => {
    const session = await sessionLaden()
    setPartner(session ? await eigenenPartnerLaden(session.user.id) : null)
  }, [])

  useEffect(() => {
    let abgebrochen = false

    const initial = async () => {
      try {
        await neuLaden()
      } finally {
        if (!abgebrochen) setLaedt(false)
      }
    }
    void initial()

    const abbestellen = aufSessionWechselHoeren((session) => {
      if (abgebrochen) return
      if (!session) {
        setPartner(null)
        return
      }
      void eigenenPartnerLaden(session.user.id).then((p) => {
        if (!abgebrochen) setPartner(p)
      })
    })

    return () => {
      abgebrochen = true
      abbestellen()
    }
  }, [neuLaden])

  const wert = useMemo<AuthKontext>(
    () => ({
      partner,
      laedt,
      angemeldet: partner !== null,
      darf: (min_role) =>
        partner ? hatMindestensRolle(partner.rolle, min_role) : false,
      abmelden: abmeldenApi,
      neuLaden,
    }),
    [partner, laedt, neuLaden],
  )

  return <Kontext value={wert}>{children}</Kontext>
}
