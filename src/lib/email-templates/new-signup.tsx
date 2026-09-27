import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

/** Where new-signup alerts are delivered. */
export const OWNER_ALERT_EMAIL = 'justinbanta1111@gmail.com'

interface Props {
  userEmail?: string
  signedUpAt?: string
  method?: string
  totalUsers?: number
}

const NewSignupEmail = ({ userEmail, signedUpAt, method, totalUsers }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New signup: {userEmail ?? 'a new account was created'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New signup</Heading>
        <Text style={lead}>Someone just created an account on The Fridge and Cupboard.</Text>
        <Section style={card}>
          <Text style={row}>
            <strong>Email:</strong> {userEmail ?? 'Not provided'}
          </Text>
          <Text style={row}>
            <strong>Signed up:</strong> {signedUpAt ?? 'Just now'}
          </Text>
          <Text style={row}>
            <strong>Method:</strong> {method ?? 'Unknown'}
          </Text>
          {typeof totalUsers === 'number' && (
            <Text style={row}>
              <strong>Total accounts:</strong> {totalUsers}
            </Text>
          )}
        </Section>
        <Text style={footer}>The Fridge and Cupboard</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewSignupEmail,
  subject: (data: Record<string, unknown>) =>
    `New signup: ${(data['userEmail'] as string) || 'new account'}`,
  displayName: 'New signup alert',
  to: OWNER_ALERT_EMAIL,
  previewData: {
    userEmail: 'someone@example.com',
    signedUpAt: 'Sep 19, 2026, 9:14 AM AKDT',
    method: 'Google',
    totalUsers: 63,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const heading = { fontSize: '22px', margin: '0 0 6px', color: '#1f2937' }
const lead = { fontSize: '15px', color: '#4b5563', margin: '0 0 18px' }
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '14px 18px',
  backgroundColor: '#fffaf0',
}
const row = { fontSize: '14px', color: '#1f2937', margin: '6px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', marginTop: '22px' }
