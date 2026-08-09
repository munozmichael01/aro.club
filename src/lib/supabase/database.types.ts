export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answered_at: string
          id: string
          profile_id: string
          question_key: string
          value: Json
          version_id: number
        }
        Insert: {
          answered_at?: string
          id?: string
          profile_id: string
          question_key: string
          value: Json
          version_id: number
        }
        Update: {
          answered_at?: string
          id?: string
          profile_id?: string
          question_key?: string
          value?: Json
          version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_envios: {
        Row: {
          created_at: string
          email: string
          id: number
          kind: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          kind: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          kind?: string
        }
        Relationships: []
      }
      booking_zones: {
        Row: {
          booking_id: string
          zone_slug: string
        }
        Insert: {
          booking_id: string
          zone_slug: string
        }
        Update: {
          booking_id?: string
          zone_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_zones_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_zones_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_zones_zone_slug_fkey"
            columns: ["zone_slug"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["slug"]
          },
        ]
      }
      bookings: {
        Row: {
          after_rsvp: boolean | null
          attended_marked_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          event_id: string
          held_until: string | null
          hold_until: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["booking_status_t"]
        }
        Insert: {
          after_rsvp?: boolean | null
          attended_marked_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          event_id: string
          held_until?: string | null
          hold_until?: string | null
          id?: string
          profile_id: string
          status?: Database["public"]["Enums"]["booking_status_t"]
        }
        Update: {
          after_rsvp?: boolean | null
          attended_marked_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          event_id?: string
          held_until?: string | null
          hold_until?: string | null
          id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["booking_status_t"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_attended_marked_by_fkey"
            columns: ["attended_marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_attended_marked_by_fkey"
            columns: ["attended_marked_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "bookings_attended_marked_by_fkey"
            columns: ["attended_marked_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "bookings_attended_marked_by_fkey"
            columns: ["attended_marked_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_matching_signal"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          is_open: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          is_open?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          is_open?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          booking_id: string | null
          created_at: string
          delta: number
          expires_at: string | null
          id: string
          note: string | null
          payment_id: string | null
          profile_id: string
          reason: Database["public"]["Enums"]["credit_reason_t"]
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          delta: number
          expires_at?: string | null
          id?: string
          note?: string | null
          payment_id?: string | null
          profile_id: string
          reason: Database["public"]["Enums"]["credit_reason_t"]
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          delta?: number
          expires_at?: string | null
          id?: string
          note?: string | null
          payment_id?: string | null
          profile_id?: string
          reason?: Database["public"]["Enums"]["credit_reason_t"]
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "credit_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "credit_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "credit_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dinner_tables: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notes_ops: string | null
          restaurant_id: string | null
          run_id: string | null
          score: number | null
          score_breakdown: Json | null
          table_number: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notes_ops?: string | null
          restaurant_id?: string | null
          run_id?: string | null
          score?: number | null
          score_breakdown?: Json | null
          table_number: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notes_ops?: string | null
          restaurant_id?: string | null
          run_id?: string | null
          score?: number | null
          score_breakdown?: Json | null
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dinner_tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dinner_tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_matching_signal"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dinner_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dinner_tables_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "matching_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_aliases: {
        Row: {
          alias: string
          canonical: string
          confirmed_by: string | null
          created_at: string
        }
        Insert: {
          alias: string
          canonical: string
          confirmed_by?: string | null
          created_at?: string
        }
        Update: {
          alias?: string
          canonical?: string
          confirmed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_aliases_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_aliases_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employer_aliases_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employer_aliases_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_venues: {
        Row: {
          created_at: string
          event_id: string
          id: string
          max_tables: number | null
          restaurant_id: string
          zone_slug: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          max_tables?: number | null
          restaurant_id: string
          zone_slug: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          max_tables?: number | null
          restaurant_id?: string
          zone_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_venues_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_venues_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_matching_signal"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_venues_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_venues_zone_slug_fkey"
            columns: ["zone_slug"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["slug"]
          },
        ]
      }
      events: {
        Row: {
          after_reveal_at: string | null
          after_starts_at: string | null
          after_venue_id: string | null
          age_band_max: number | null
          age_band_min: number | null
          booking_closes_at: string
          city: string
          city_slug: string
          created_at: string
          credit_cost: number
          format: Database["public"]["Enums"]["event_format_t"]
          id: string
          max_seats: number | null
          min_tables: number
          price_usd: number | null
          restaurant_id: string | null
          reveal_at: string
          seats_per_table: number
          starts_at: string
          status: Database["public"]["Enums"]["event_status_t"]
          zone_slug: string | null
        }
        Insert: {
          after_reveal_at?: string | null
          after_starts_at?: string | null
          after_venue_id?: string | null
          age_band_max?: number | null
          age_band_min?: number | null
          booking_closes_at: string
          city?: string
          city_slug: string
          created_at?: string
          credit_cost?: number
          format?: Database["public"]["Enums"]["event_format_t"]
          id?: string
          max_seats?: number | null
          min_tables?: number
          price_usd?: number | null
          restaurant_id?: string | null
          reveal_at: string
          seats_per_table?: number
          starts_at: string
          status?: Database["public"]["Enums"]["event_status_t"]
          zone_slug?: string | null
        }
        Update: {
          after_reveal_at?: string | null
          after_starts_at?: string | null
          after_venue_id?: string | null
          age_band_max?: number | null
          age_band_min?: number | null
          booking_closes_at?: string
          city?: string
          city_slug?: string
          created_at?: string
          credit_cost?: number
          format?: Database["public"]["Enums"]["event_format_t"]
          id?: string
          max_seats?: number | null
          min_tables?: number
          price_usd?: number | null
          restaurant_id?: string | null
          reveal_at?: string
          seats_per_table?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status_t"]
          zone_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_after_venue_id_fkey"
            columns: ["after_venue_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_city_slug_fkey"
            columns: ["city_slug"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "events_city_slug_fkey"
            columns: ["city_slug"]
            isOneToOne: false
            referencedRelation: "v_city_demand"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_zone_slug_fkey"
            columns: ["zone_slug"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["slug"]
          },
        ]
      }
      exclusions: {
        Row: {
          created_at: string
          created_by: string | null
          profile_a: string
          profile_b: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          profile_a: string
          profile_b: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          profile_a?: string
          profile_b?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "exclusions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exclusions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "exclusions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "exclusions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exclusions_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exclusions_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "exclusions_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "exclusions_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exclusions_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exclusions_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "exclusions_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "exclusions_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          created_at: string
          rate_date: string
          set_by: string | null
          source: string
          usd_to_ves: number
        }
        Insert: {
          created_at?: string
          rate_date: string
          set_by?: string | null
          source?: string
          usd_to_ves: number
        }
        Update: {
          created_at?: string
          rate_date?: string
          set_by?: string | null
          source?: string
          usd_to_ves?: number
        }
        Relationships: [
          {
            foreignKeyName: "fx_rates_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fx_rates_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fx_rates_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fx_rates_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string
          event_id: string | null
          id: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["incident_severity_t"]
          subject_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description: string
          event_id?: string | null
          id?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity_t"]
          subject_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string
          event_id?: string | null
          id?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity_t"]
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_matching_signal"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "incident_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "incident_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "incident_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "incident_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "incident_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "incident_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "incident_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_runs: {
        Row: {
          algo_version: string
          avg_score: number | null
          created_at: string
          created_by: string | null
          event_id: string
          forced_at: string | null
          forced_by: string | null
          id: string
          is_published: boolean
          min_score: number | null
          pool_size: number
          proposal: Json | null
          published_at: string | null
          published_breaks: Json | null
          published_by: string | null
          runtime_ms: number | null
          tables_created: number
          unmatched: Json | null
          weights: Json
        }
        Insert: {
          algo_version: string
          avg_score?: number | null
          created_at?: string
          created_by?: string | null
          event_id: string
          forced_at?: string | null
          forced_by?: string | null
          id?: string
          is_published?: boolean
          min_score?: number | null
          pool_size: number
          proposal?: Json | null
          published_at?: string | null
          published_breaks?: Json | null
          published_by?: string | null
          runtime_ms?: number | null
          tables_created: number
          unmatched?: Json | null
          weights: Json
        }
        Update: {
          algo_version?: string
          avg_score?: number | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          forced_at?: string | null
          forced_by?: string | null
          id?: string
          is_published?: boolean
          min_score?: number | null
          pool_size?: number
          proposal?: Json | null
          published_at?: string | null
          published_breaks?: Json | null
          published_by?: string | null
          runtime_ms?: number | null
          tables_created?: number
          unmatched?: Json | null
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "matching_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "matching_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "matching_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_matching_signal"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "matching_runs_forced_by_fkey"
            columns: ["forced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_runs_forced_by_fkey"
            columns: ["forced_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "matching_runs_forced_by_fkey"
            columns: ["forced_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "matching_runs_forced_by_fkey"
            columns: ["forced_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_runs_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_runs_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "matching_runs_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "matching_runs_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          expires_at: string
          grace_until: string | null
          id: string
          payment_id: string | null
          product_id: string
          profile_id: string
          started_at: string
          status: Database["public"]["Enums"]["membership_status_t"]
        }
        Insert: {
          created_at?: string
          expires_at: string
          grace_until?: string | null
          id?: string
          payment_id?: string | null
          product_id: string
          profile_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["membership_status_t"]
        }
        Update: {
          created_at?: string
          expires_at?: string
          grace_until?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string
          profile_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["membership_status_t"]
        }
        Relationships: [
          {
            foreignKeyName: "memberships_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: number
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: number
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ops_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ops_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_encounters: {
        Row: {
          last_met_at: string
          profile_a: string
          profile_b: string
          times_met: number
        }
        Insert: {
          last_met_at?: string
          profile_a: string
          profile_b: string
          times_met?: number
        }
        Update: {
          last_met_at?: string
          profile_a?: string
          profile_b?: string
          times_met?: number
        }
        Relationships: [
          {
            foreignKeyName: "pair_encounters_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_encounters_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "pair_encounters_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "pair_encounters_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_encounters_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_encounters_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "pair_encounters_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "pair_encounters_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_code: string | null
          bank_name: string | null
          document_id: string | null
          id: string
          instructions: string | null
          is_active: boolean
          label: string
          method: Database["public"]["Enums"]["payment_method_t"]
          phone_e164: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          document_id?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          label: string
          method: Database["public"]["Enums"]["payment_method_t"]
          phone_e164?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          document_id?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          label?: string
          method?: Database["public"]["Enums"]["payment_method_t"]
          phone_e164?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          activo: boolean
          actualizado_en: string
          campos: Json
          captura_obligatoria: boolean
          datos_cuenta: Json
          id: string
          manual: boolean
          moneda: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          campos?: Json
          captura_obligatoria?: boolean
          datos_cuenta?: Json
          id: string
          manual?: boolean
          moneda: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          campos?: Json
          captura_obligatoria?: boolean
          datos_cuenta?: Json
          id?: string
          manual?: boolean
          moneda?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_local: number | null
          amount_usd: number
          booking_id: string | null
          captura_path: string | null
          cents_token: number | null
          charge_date: string
          created_at: string
          datos: Json
          fx_congelado_en: string | null
          fx_rate: number | null
          id: string
          method: Database["public"]["Enums"]["payment_method_t"]
          metodo: string | null
          moneda: string | null
          paid_at: string | null
          payer_bank: string | null
          product_id: string | null
          profile_id: string
          proof_path: string | null
          reference_code: string | null
          rejection_note: string | null
          reportado_en: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status_t"]
          tx_hash: string | null
        }
        Insert: {
          amount_local?: number | null
          amount_usd: number
          booking_id?: string | null
          captura_path?: string | null
          cents_token?: number | null
          charge_date?: string
          created_at?: string
          datos?: Json
          fx_congelado_en?: string | null
          fx_rate?: number | null
          id?: string
          method: Database["public"]["Enums"]["payment_method_t"]
          metodo?: string | null
          moneda?: string | null
          paid_at?: string | null
          payer_bank?: string | null
          product_id?: string | null
          profile_id: string
          proof_path?: string | null
          reference_code?: string | null
          rejection_note?: string | null
          reportado_en?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status_t"]
          tx_hash?: string | null
        }
        Update: {
          amount_local?: number | null
          amount_usd?: number
          booking_id?: string | null
          captura_path?: string | null
          cents_token?: number | null
          charge_date?: string
          created_at?: string
          datos?: Json
          fx_congelado_en?: string | null
          fx_rate?: number | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method_t"]
          metodo?: string | null
          moneda?: string | null
          paid_at?: string | null
          payer_bank?: string | null
          product_id?: string | null
          profile_id?: string
          proof_path?: string | null
          reference_code?: string | null
          rejection_note?: string | null
          reportado_en?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status_t"]
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "payments_metodo_fkey"
            columns: ["metodo"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_feedback: {
        Row: {
          comment: string | null
          created_at: string
          flag_conduct: boolean
          id: string
          rated_id: string
          rater_id: string
          signal: string
          table_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          flag_conduct?: boolean
          id?: string
          rated_id: string
          rater_id: string
          signal: string
          table_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          flag_conduct?: boolean
          id?: string
          rated_id?: string
          rater_id?: string
          signal?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_feedback_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_feedback_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "peer_feedback_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "peer_feedback_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_feedback_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_feedback_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "peer_feedback_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "peer_feedback_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_feedback_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dinner_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          credits_granted: number | null
          duration_days: number | null
          id: string
          is_active: boolean
          kind: string
          name: string
          price_usd: number
          sku: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          credits_granted?: number | null
          duration_days?: number | null
          id?: string
          is_active?: boolean
          kind: string
          name: string
          price_usd: number
          sku: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          credits_granted?: number | null
          duration_days?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          price_usd?: number
          sku?: string
          sort_order?: number
        }
        Relationships: []
      }
      profile_identities: {
        Row: {
          created_at: string
          profile_id: string
          provider: Database["public"]["Enums"]["auth_provider_t"]
          provider_email: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          profile_id: string
          provider: Database["public"]["Enums"]["auth_provider_t"]
          provider_email?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          profile_id?: string
          provider?: Database["public"]["Enums"]["auth_provider_t"]
          provider_email?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_traits: {
        Row: {
          age: number | null
          availability: string[]
          budget_tier: number | null
          computed_at: string
          conversation_topics: string[]
          dealbreakers: string[]
          dietary: string[]
          dining_focus: string | null
          employer: string | null
          employer_normalized: string | null
          formats: string[]
          gender: Database["public"]["Enums"]["gender_t"] | null
          industry: string | null
          intention: string | null
          interests: string[]
          languages: string[]
          life_stage: string | null
          profile_id: string
          romantic_openness: string | null
          rootedness: Database["public"]["Enums"]["rootedness_t"] | null
          social_energy: Database["public"]["Enums"]["social_energy_t"] | null
          version_id: number
          zones: string[]
        }
        Insert: {
          age?: number | null
          availability?: string[]
          budget_tier?: number | null
          computed_at?: string
          conversation_topics?: string[]
          dealbreakers?: string[]
          dietary?: string[]
          dining_focus?: string | null
          employer?: string | null
          employer_normalized?: string | null
          formats?: string[]
          gender?: Database["public"]["Enums"]["gender_t"] | null
          industry?: string | null
          intention?: string | null
          interests?: string[]
          languages?: string[]
          life_stage?: string | null
          profile_id: string
          romantic_openness?: string | null
          rootedness?: Database["public"]["Enums"]["rootedness_t"] | null
          social_energy?: Database["public"]["Enums"]["social_energy_t"] | null
          version_id: number
          zones?: string[]
        }
        Update: {
          age?: number | null
          availability?: string[]
          budget_tier?: number | null
          computed_at?: string
          conversation_topics?: string[]
          dealbreakers?: string[]
          dietary?: string[]
          dining_focus?: string | null
          employer?: string | null
          employer_normalized?: string | null
          formats?: string[]
          gender?: Database["public"]["Enums"]["gender_t"] | null
          industry?: string | null
          intention?: string | null
          interests?: string[]
          languages?: string[]
          life_stage?: string | null
          profile_id?: string
          romantic_openness?: string | null
          rootedness?: Database["public"]["Enums"]["rootedness_t"] | null
          social_energy?: Database["public"]["Enums"]["social_energy_t"] | null
          version_id?: number
          zones?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "profile_traits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_traits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_traits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_traits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_traits_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birthdate: string | null
          city_slug: string | null
          contact_email: string | null
          created_at: string
          display_name: string | null
          email: string
          events_attended: number
          first_event_at: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_t"]
          id: string
          invite_depth: number
          invited_by: string | null
          last_event_at: string | null
          locale: string
          neighborhood: string | null
          notes_ops: string | null
          phone_e164: string | null
          role: Database["public"]["Enums"]["app_role_t"]
          rootedness: Database["public"]["Enums"]["rootedness_t"] | null
          status: Database["public"]["Enums"]["member_status_t"]
          updated_at: string
          waitlist_id: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          birthdate?: string | null
          city_slug?: string | null
          contact_email?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          events_attended?: number
          first_event_at?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_t"]
          id: string
          invite_depth?: number
          invited_by?: string | null
          last_event_at?: string | null
          locale?: string
          neighborhood?: string | null
          notes_ops?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["app_role_t"]
          rootedness?: Database["public"]["Enums"]["rootedness_t"] | null
          status?: Database["public"]["Enums"]["member_status_t"]
          updated_at?: string
          waitlist_id?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          birthdate?: string | null
          city_slug?: string | null
          contact_email?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          events_attended?: number
          first_event_at?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_t"]
          id?: string
          invite_depth?: number
          invited_by?: string | null
          last_event_at?: string | null
          locale?: string
          neighborhood?: string | null
          notes_ops?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["app_role_t"]
          rootedness?: Database["public"]["Enums"]["rootedness_t"] | null
          status?: Database["public"]["Enums"]["member_status_t"]
          updated_at?: string
          waitlist_id?: string | null
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_slug_fkey"
            columns: ["city_slug"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "profiles_city_slug_fkey"
            columns: ["city_slug"]
            isOneToOne: false
            referencedRelation: "v_city_demand"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_versions: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          published_at: string | null
          version: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          published_at?: string | null
          version: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          published_at?: string | null
          version?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          autocomplete: Json | null
          exclusive_value: string | null
          help_text: string | null
          id: string
          input_type: string
          is_matching_input: boolean
          is_required: boolean
          key: string
          layout: string | null
          max_select: number | null
          min_select: number | null
          options: Json | null
          prompt: string
          screen: number
          sort_order: number
          version_id: number
        }
        Insert: {
          autocomplete?: Json | null
          exclusive_value?: string | null
          help_text?: string | null
          id?: string
          input_type: string
          is_matching_input?: boolean
          is_required?: boolean
          key: string
          layout?: string | null
          max_select?: number | null
          min_select?: number | null
          options?: Json | null
          prompt: string
          screen?: number
          sort_order: number
          version_id: number
        }
        Update: {
          autocomplete?: Json | null
          exclusive_value?: string | null
          help_text?: string | null
          id?: string
          input_type?: string
          is_matching_input?: boolean
          is_required?: boolean
          key?: string
          layout?: string | null
          max_select?: number | null
          min_select?: number | null
          options?: Json | null
          prompt?: string
          screen?: number
          sort_order?: number
          version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string
          avg_check_usd: number | null
          avg_rating: number | null
          budget_tier: number | null
          commission_pct: number | null
          commission_per_head: number | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          facade_photo_path: string | null
          fixed_menu_usd: number | null
          formats: Database["public"]["Enums"]["event_format_t"][]
          has_parking: boolean
          id: string
          is_active: boolean
          is_after_venue: boolean
          maps_url: string | null
          max_tables: number
          name: string
          noise_level: number | null
          safety_notes: string | null
          zone_slug: string | null
        }
        Insert: {
          address: string
          avg_check_usd?: number | null
          avg_rating?: number | null
          budget_tier?: number | null
          commission_pct?: number | null
          commission_per_head?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          facade_photo_path?: string | null
          fixed_menu_usd?: number | null
          formats?: Database["public"]["Enums"]["event_format_t"][]
          has_parking?: boolean
          id?: string
          is_active?: boolean
          is_after_venue?: boolean
          maps_url?: string | null
          max_tables?: number
          name: string
          noise_level?: number | null
          safety_notes?: string | null
          zone_slug?: string | null
        }
        Update: {
          address?: string
          avg_check_usd?: number | null
          avg_rating?: number | null
          budget_tier?: number | null
          commission_pct?: number | null
          commission_per_head?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          facade_photo_path?: string | null
          fixed_menu_usd?: number | null
          formats?: Database["public"]["Enums"]["event_format_t"][]
          has_parking?: boolean
          id?: string
          is_active?: boolean
          is_after_venue?: boolean
          maps_url?: string | null
          max_tables?: number
          name?: string
          noise_level?: number | null
          safety_notes?: string | null
          zone_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "restaurants_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "restaurants_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_zone_slug_fkey"
            columns: ["zone_slug"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["slug"]
          },
        ]
      }
      scheduled_emails: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          kind: Database["public"]["Enums"]["email_kind_t"]
          payload: Json
          profile_id: string
          send_at: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["email_kind_t"]
          payload?: Json
          profile_id: string
          send_at: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["email_kind_t"]
          payload?: Json
          profile_id?: string
          send_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_matching_signal"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "scheduled_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "scheduled_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      table_feedback: {
        Row: {
          attended_after: boolean | null
          comment: string | null
          connections_made: number | null
          conversation_rating: number | null
          created_at: string
          id: string
          nps: number | null
          profile_id: string
          restaurant_rating: number | null
          table_id: string
          would_repeat: boolean | null
        }
        Insert: {
          attended_after?: boolean | null
          comment?: string | null
          connections_made?: number | null
          conversation_rating?: number | null
          created_at?: string
          id?: string
          nps?: number | null
          profile_id: string
          restaurant_rating?: number | null
          table_id: string
          would_repeat?: boolean | null
        }
        Update: {
          attended_after?: boolean | null
          comment?: string | null
          connections_made?: number | null
          conversation_rating?: number | null
          created_at?: string
          id?: string
          nps?: number | null
          profile_id?: string
          restaurant_rating?: number | null
          table_id?: string
          would_repeat?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "table_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "table_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "table_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_feedback_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dinner_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_members: {
        Row: {
          booking_id: string
          profile_id: string
          seat_order: number | null
          table_id: string
        }
        Insert: {
          booking_id: string
          profile_id: string
          seat_order?: number | null
          table_id: string
        }
        Update: {
          booking_id?: string
          profile_id?: string
          seat_order?: number | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_members_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_members_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "table_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "table_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "table_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_members_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dinner_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_handoffs: {
        Row: {
          claimed_at: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          profile_id: string
          token_hash: string
        }
        Insert: {
          claimed_at?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          profile_id: string
          token_hash: string
        }
        Update: {
          claimed_at?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          profile_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_handoffs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_handoffs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verification_handoffs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verification_handoffs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_rejection_reasons: {
        Row: {
          allows_retry: boolean
          code: string
          label: string
          message: string
          sort_order: number
        }
        Insert: {
          allows_retry: boolean
          code: string
          label: string
          message: string
          sort_order: number
        }
        Update: {
          allows_retry?: boolean
          code?: string
          label?: string
          message?: string
          sort_order?: number
        }
        Relationships: []
      }
      verifications: {
        Row: {
          age_confirmed: boolean | null
          created_at: string
          expires_at: string | null
          external_ref: string | null
          id: string
          kind: Database["public"]["Enums"]["verification_kind_t"]
          name_matches: boolean | null
          profile_id: string
          rejection_note: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status_t"]
          storage_path: string | null
        }
        Insert: {
          age_confirmed?: boolean | null
          created_at?: string
          expires_at?: string | null
          external_ref?: string | null
          id?: string
          kind: Database["public"]["Enums"]["verification_kind_t"]
          name_matches?: boolean | null
          profile_id: string
          rejection_note?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status_t"]
          storage_path?: string | null
        }
        Update: {
          age_confirmed?: boolean | null
          created_at?: string
          expires_at?: string | null
          external_ref?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["verification_kind_t"]
          name_matches?: boolean | null
          profile_id?: string
          rejection_note?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status_t"]
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_rejection_reason_fkey"
            columns: ["rejection_reason"]
            isOneToOne: false
            referencedRelation: "verification_rejection_reasons"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          base_completed_at: string | null
          birthdate: string | null
          city: string
          city_slug: string | null
          conversation_topics: string[]
          converted_profile_id: string | null
          created_at: string
          days: string[]
          display_name: string | null
          email: string
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_t"] | null
          id: string
          phone_e164: string | null
          profile_answers: Json
          profile_completed_at: string | null
          questionnaire_screen: number
          quiz_completed_at: string | null
          referral_code: string | null
          rootedness: Database["public"]["Enums"]["rootedness_t"] | null
          source: string | null
          zones: string[]
        }
        Insert: {
          base_completed_at?: string | null
          birthdate?: string | null
          city?: string
          city_slug?: string | null
          conversation_topics?: string[]
          converted_profile_id?: string | null
          created_at?: string
          days?: string[]
          display_name?: string | null
          email: string
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          phone_e164?: string | null
          profile_answers?: Json
          profile_completed_at?: string | null
          questionnaire_screen?: number
          quiz_completed_at?: string | null
          referral_code?: string | null
          rootedness?: Database["public"]["Enums"]["rootedness_t"] | null
          source?: string | null
          zones?: string[]
        }
        Update: {
          base_completed_at?: string | null
          birthdate?: string | null
          city?: string
          city_slug?: string | null
          conversation_topics?: string[]
          converted_profile_id?: string | null
          created_at?: string
          days?: string[]
          display_name?: string | null
          email?: string
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          phone_e164?: string | null
          profile_answers?: Json
          profile_completed_at?: string | null
          questionnaire_screen?: number
          quiz_completed_at?: string | null
          referral_code?: string | null
          rootedness?: Database["public"]["Enums"]["rootedness_t"] | null
          source?: string | null
          zones?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "waitlist_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "v_city_demand"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "waitlist_city_slug_fkey"
            columns: ["city_slug"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "waitlist_city_slug_fkey"
            columns: ["city_slug"]
            isOneToOne: false
            referencedRelation: "v_city_demand"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "waitlist_converted_profile_id_fkey"
            columns: ["converted_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_converted_profile_id_fkey"
            columns: ["converted_profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "waitlist_converted_profile_id_fkey"
            columns: ["converted_profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "waitlist_converted_profile_id_fkey"
            columns: ["converted_profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          city_slug: string
          is_active: boolean
          municipality: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          city_slug: string
          is_active?: boolean
          municipality?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          city_slug?: string
          is_active?: boolean
          municipality?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "zones_city_slug_fkey"
            columns: ["city_slug"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "zones_city_slug_fkey"
            columns: ["city_slug"]
            isOneToOne: false
            referencedRelation: "v_city_demand"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Views: {
      v_city_demand: {
        Row: {
          con_quiz: number | null
          is_open: boolean | null
          leads: number | null
          name: string | null
          slug: string | null
          ultimo_lead: string | null
          ultimos_7d: number | null
        }
        Relationships: []
      }
      v_cola_verificacion: {
        Row: {
          birthdate: string | null
          display_name: string | null
          doc_pendiente: number | null
          email: string | null
          espera_desde: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_t"] | null
          profile_id: string | null
          rechazos_previos: number | null
          selfie_pendiente: number | null
        }
        Relationships: []
      }
      v_credit_balance: {
        Row: {
          balance: number | null
          profile_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "credit_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "credit_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_lead_progreso: {
        Row: {
          city: string | null
          cuestionario_hecho: boolean | null
          datos_base_hechos: boolean | null
          email: string | null
          questionnaire_screen: number | null
          quiz_hecho: boolean | null
          respuestas: number | null
          tiene_cuenta: boolean | null
        }
        Insert: {
          city?: string | null
          cuestionario_hecho?: never
          datos_base_hechos?: never
          email?: string | null
          questionnaire_screen?: number | null
          quiz_hecho?: never
          respuestas?: never
          tiene_cuenta?: never
        }
        Update: {
          city?: string | null
          cuestionario_hecho?: never
          datos_base_hechos?: never
          email?: string | null
          questionnaire_screen?: number | null
          quiz_hecho?: never
          respuestas?: never
          tiene_cuenta?: never
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "waitlist_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "v_city_demand"
            referencedColumns: ["slug"]
          },
        ]
      }
      v_matching_pool: {
        Row: {
          age: number | null
          booking_id: string | null
          budget_tier: number | null
          conversation_topics: string[] | null
          dealbreakers: string[] | null
          dietary: string[] | null
          dining_focus: string | null
          employer_key: string | null
          event_id: string | null
          gender: Database["public"]["Enums"]["gender_t"] | null
          industry: string | null
          intention: string | null
          interests: string[] | null
          languages: string[] | null
          life_stage: string | null
          profile_id: string | null
          romantic_openness: string | null
          rootedness: Database["public"]["Enums"]["rootedness_t"] | null
          social_energy: Database["public"]["Enums"]["social_energy_t"] | null
          zones: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_matching_signal"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_matching_signal: {
        Row: {
          avg_nps: number | null
          between_table_stddev: number | null
          event_id: string | null
          starts_at: string | null
          tables_count: number | null
        }
        Relationships: []
      }
      v_rechazos_por_perfil: {
        Row: {
          motivos: string[] | null
          profile_id: string | null
          rechazos: number | null
          sin_reintento: number | null
          ultimo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_second_attendance: {
        Row: {
          first_at: string | null
          is_transient: boolean | null
          profile_id: string | null
          returned_60d: boolean | null
          rootedness: Database["public"]["Enums"]["rootedness_t"] | null
          second_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_cola_verificacion"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_matching_pool"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_verified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_verified_profiles: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      a_texto: { Args: { v: Json }; Returns: string[] }
      age_years: { Args: { d: string }; Returns: number }
      convertir_lead:
        | {
            Args: { p_email: string; p_profile_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_auth_email: string
              p_lead_email: string
              p_profile_id: string
            }
            Returns: undefined
          }
      despublicar_evento: { Args: { p_event_id: string }; Returns: undefined }
      despublicar_mesa: {
        Args: { p_table_id: string }
        Returns: {
          correos_retirados: number
        }[]
      }
      guardar_respuesta: {
        Args: {
          p_clave: string
          p_email: string
          p_fin?: boolean
          p_pantalla?: number
          p_valor: Json
        }
        Returns: undefined
      }
      is_ops: { Args: never; Returns: boolean }
      limpiar_traspasos: { Args: never; Returns: undefined }
      normalize_employer: { Args: { raw: string }; Returns: string }
      purgar_documentos_verificacion: {
        Args: never
        Returns: {
          borradas: number
        }[]
      }
      refrescar_rasgos: { Args: { p_profile_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role_t: "member" | "ops" | "admin"
      auth_provider_t: "password" | "apple" | "google"
      booking_status_t:
        | "held"
        | "pending_payment"
        | "confirmed"
        | "waitlisted"
        | "cancelled_by_user"
        | "cancelled_by_ops"
        | "no_show"
        | "attended"
      credit_reason_t:
        | "pack_purchase"
        | "event_charge"
        | "refund"
        | "goodwill"
        | "referral_bonus"
        | "no_show_penalty"
        | "expiry"
        | "manual_adjustment"
      email_kind_t:
        | "bienvenida"
        | "verificacion"
        | "mesa_asignada"
        | "recordatorio"
        | "comprobante"
        | "pago_en_revision"
        | "pago_confirmado"
        | "pago_no_cuadra"
        | "cancelacion"
      event_format_t:
        | "dinner"
        | "foodie_dinner"
        | "women_dinner"
        | "coffee"
        | "drinks"
        | "walk"
        | "hike"
        | "run"
        | "padel"
        | "pilates"
        | "cycling"
      event_status_t:
        | "draft"
        | "open"
        | "locked"
        | "matched"
        | "running"
        | "completed"
        | "cancelled"
      gender_t: "mujer" | "hombre" | "no-binario" | "sin-decir"
      incident_severity_t: "low" | "medium" | "high" | "critical"
      member_status_t:
        | "lead"
        | "pending_questionnaire"
        | "pending_verification"
        | "active"
        | "paused"
        | "banned"
      membership_status_t: "active" | "grace" | "expired" | "cancelled"
      payment_method_t:
        | "pago_movil"
        | "bank_transfer"
        | "c2p"
        | "usdt"
        | "zelle"
        | "cash"
        | "credits"
        | "membership"
        | "comp"
      payment_status_t:
        | "awaiting_proof"
        | "under_review"
        | "confirmed"
        | "rejected"
        | "refunded"
      rootedness_t:
        | "volvio"
        | "se-quedo"
        | "interior"
        | "visita"
        | "mismos"
        | "remoto"
      social_energy_t: "escucha" | "depende" | "lleva"
      verification_kind_t:
        | "id_document"
        | "selfie"
        | "social_profile"
        | "referral"
      verification_status_t: "pending" | "approved" | "rejected" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role_t: ["member", "ops", "admin"],
      auth_provider_t: ["password", "apple", "google"],
      booking_status_t: [
        "held",
        "pending_payment",
        "confirmed",
        "waitlisted",
        "cancelled_by_user",
        "cancelled_by_ops",
        "no_show",
        "attended",
      ],
      credit_reason_t: [
        "pack_purchase",
        "event_charge",
        "refund",
        "goodwill",
        "referral_bonus",
        "no_show_penalty",
        "expiry",
        "manual_adjustment",
      ],
      email_kind_t: [
        "bienvenida",
        "verificacion",
        "mesa_asignada",
        "recordatorio",
        "comprobante",
        "pago_en_revision",
        "pago_confirmado",
        "pago_no_cuadra",
        "cancelacion",
      ],
      event_format_t: [
        "dinner",
        "foodie_dinner",
        "women_dinner",
        "coffee",
        "drinks",
        "walk",
        "hike",
        "run",
        "padel",
        "pilates",
        "cycling",
      ],
      event_status_t: [
        "draft",
        "open",
        "locked",
        "matched",
        "running",
        "completed",
        "cancelled",
      ],
      gender_t: ["mujer", "hombre", "no-binario", "sin-decir"],
      incident_severity_t: ["low", "medium", "high", "critical"],
      member_status_t: [
        "lead",
        "pending_questionnaire",
        "pending_verification",
        "active",
        "paused",
        "banned",
      ],
      membership_status_t: ["active", "grace", "expired", "cancelled"],
      payment_method_t: [
        "pago_movil",
        "bank_transfer",
        "c2p",
        "usdt",
        "zelle",
        "cash",
        "credits",
        "membership",
        "comp",
      ],
      payment_status_t: [
        "awaiting_proof",
        "under_review",
        "confirmed",
        "rejected",
        "refunded",
      ],
      rootedness_t: [
        "volvio",
        "se-quedo",
        "interior",
        "visita",
        "mismos",
        "remoto",
      ],
      social_energy_t: ["escucha", "depende", "lleva"],
      verification_kind_t: [
        "id_document",
        "selfie",
        "social_profile",
        "referral",
      ],
      verification_status_t: ["pending", "approved", "rejected", "expired"],
    },
  },
} as const
