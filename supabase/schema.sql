-- Casa Juan — Supabase schema
-- Run this in the Supabase SQL editor (or via the CLI) before starting the server.

create extension if not exists pgcrypto;

CREATE TABLE subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  zip_code text,
  referral_source text,
  subscribed_at timestamp with time zone DEFAULT now(),
  confirmed boolean DEFAULT false,
  tags text[] DEFAULT '{}'
);

CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_subscribed_at ON subscribers(subscribed_at);

CREATE TABLE campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  sent_at timestamp with time zone,
  recipient_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,
  session_id text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);
