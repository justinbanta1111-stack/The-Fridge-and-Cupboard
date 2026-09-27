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
  feedbackUrl?: string
}

const FeedbackRequestEmail = ({ feedbackUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>What would make The Fridge and Cupboard even better for you?</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>How is it going in your kitchen?</Heading>

        <Text style={lead}>
          You have been cooking with The Fridge and Cupboard, and that genuinely means a lot. We
          are a small operation, and the app gets better mostly because people like you tell us
          what they wish it did.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>If you have a minute, we would love to know:</Text>
          <Text style={row}>• What has been the most useful part so far?</Text>
          <Text style={row}>• What felt confusing or slower than it should be?</Text>
          <Text style={row}>• What would you add if it were up to you?</Text>
        </Section>

        {feedbackUrl ? (
          <Section style={ctaWrap}>
            <Button style={button} href={feedbackUrl}>
              Share My Feedback
            </Button>
          </Section>
        ) : null}

        <Text style={note}>
          You can also just hit reply to this email — every note gets read.
          {feedbackUrl ? (
            <>
              {' '}
              Or use this link:{' '}
              <Link style={link} href={feedbackUrl}>
                {feedbackUrl}
              </Link>
            </>
          ) : null}
        </Text>

        <Text style={signoff}>Thanks for cooking with us,</Text>
        <Text style={footer}>The Fridge and Cupboard</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FeedbackRequestEmail,
  subject: 'Quick question about your kitchen',
  displayName: 'Feedback request',
  previewData: { feedbackUrl: 'https://thefridgeandcupboard.com/suggestions' },
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
const note = { fontSize: '13px', color: '#4b5563', margin: '0 0 18px', lineHeight: '1.6' }
const link = { color: '#1d4ed8', wordBreak: 'break-all' as const }
const signoff = { fontSize: '14px', color: '#4b5563', margin: '0 0 2px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
