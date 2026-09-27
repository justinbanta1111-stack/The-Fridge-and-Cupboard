import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  confirmUrl?: string
  isFinal?: boolean
}

const benefits = [
  'Turn what is already in your fridge and cupboard into real meals tonight.',
  'Spend less at the store by cooking what you have before it goes bad.',
  'Waste less food — and feel good about it.',
  'Skip the nightly "what should we even make?" debate.',
]

const ConfirmEmailReminder = ({ confirmUrl, isFinal }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isFinal
        ? 'Your kitchen is still waiting — confirm your email whenever you are ready'
        : 'One quick tap and your kitchen is ready'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>
          {isFinal ? 'Still here whenever you are' : 'Welcome — your kitchen is almost ready'}
        </Heading>

        <Text style={lead}>
          {isFinal
            ? 'We saved your spot at The Fridge and Cupboard. Confirming your email is the only thing between you and your first meal idea.'
            : 'Thanks for joining The Fridge and Cupboard. Confirming your email opens the door — then Chef can look at what you already have and help you cook it.'}
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Here is what is waiting for you:</Text>
          {benefits.map((line) => (
            <Text key={line} style={row}>
              • {line}
            </Text>
          ))}
        </Section>

        {confirmUrl ? (
          <Section style={ctaWrap}>
            <Button style={button} href={confirmUrl}>
              Confirm My Account
            </Button>
          </Section>
        ) : null}

        {confirmUrl ? (
          <Text style={fallback}>
            Button not working? Paste this into your browser:
            <br />
            <Link style={link} href={confirmUrl}>
              {confirmUrl}
            </Link>
          </Text>
        ) : null}

        <Text style={note}>
          {isFinal
            ? "This is the last note we'll send about it — no pressure at all. If you didn't sign up, you can simply ignore this email."
            : 'It takes about five seconds, and then you can snap a photo of your fridge and see what you can make.'}
        </Text>

        <Text style={signoff}>Happy cooking,</Text>
        <Text style={footer}>The Fridge and Cupboard</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ConfirmEmailReminder,
  subject: (data: Record<string, unknown>) =>
    data['isFinal']
      ? 'Your kitchen is still waiting at The Fridge and Cupboard'
      : 'Confirm your account and see what you can cook tonight',
  displayName: 'Confirm email reminder',
  previewData: {
    confirmUrl: 'https://thefridgeandcupboard.com/auth/confirm?token=example',
    isFinal: false,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const heading = { fontSize: '23px', margin: '0 0 10px', color: '#1f2937' }
const lead = { fontSize: '15px', color: '#4b5563', margin: '0 0 20px', lineHeight: '1.6' }
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '16px 20px',
  backgroundColor: '#f8fafc',
  margin: '0 0 22px',
}
const cardTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#1f2937', margin: '0 0 8px' }
const row = { fontSize: '14px', color: '#374151', margin: '6px 0', lineHeight: '1.5' }
const ctaWrap = { margin: '0 0 18px' }
const button = {
  backgroundColor: '#1d4ed8',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '13px 24px',
  borderRadius: '10px',
  textDecoration: 'none',
  display: 'inline-block',
}
const fallback = { fontSize: '12px', color: '#6b7280', margin: '0 0 18px', wordBreak: 'break-all' as const }
const link = { color: '#1d4ed8' }
const note = { fontSize: '14px', color: '#4b5563', margin: '0 0 18px', lineHeight: '1.6' }
const signoff = { fontSize: '14px', color: '#4b5563', margin: '0 0 2px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
