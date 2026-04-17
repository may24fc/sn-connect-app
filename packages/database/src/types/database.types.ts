export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          review_notes: string | null
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      ai_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_at: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_at?: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_stars: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_stars_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          allow_comments: boolean | null
          author_id: string
          category: Database["public"]["Enums"]["announcement_category"]
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          excerpt: string | null
          expires_at: string | null
          has_attachments: boolean | null
          id: string
          is_pinned: boolean | null
          priority: Database["public"]["Enums"]["announcement_priority"]
          published_at: string | null
          read_count: number | null
          status: Database["public"]["Enums"]["announcement_status"]
          target_departments: string[] | null
          target_employees: string[] | null
          target_roles: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_comments?: boolean | null
          author_id: string
          category?: Database["public"]["Enums"]["announcement_category"]
          content: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          expires_at?: string | null
          has_attachments?: boolean | null
          id?: string
          is_pinned?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          published_at?: string | null
          read_count?: number | null
          status?: Database["public"]["Enums"]["announcement_status"]
          target_departments?: string[] | null
          target_employees?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_comments?: boolean | null
          author_id?: string
          category?: Database["public"]["Enums"]["announcement_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          expires_at?: string | null
          has_attachments?: boolean | null
          id?: string
          is_pinned?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          published_at?: string | null
          read_count?: number | null
          status?: Database["public"]["Enums"]["announcement_status"]
          target_departments?: string[] | null
          target_employees?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          operation: string
          performed_at: string
          performed_by: string | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          performed_at?: string
          performed_by?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          performed_at?: string
          performed_by?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      bank_registry: {
        Row: {
          bank_code: string | null
          bank_name: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          bank_code?: string | null
          bank_name: string
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          bank_code?: string | null
          bank_name?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_units: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          overview: string | null
          services: Json | null
          slug: string
          tagline: string | null
          testimonials: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          overview?: string | null
          services?: Json | null
          slug: string
          tagline?: string | null
          testimonials?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          overview?: string | null
          services?: Json | null
          slug?: string
          tagline?: string | null
          testimonials?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string | null
          flow_type: Database["public"]["Enums"]["checklist_template_flow"]
          id: string
          scope: Database["public"]["Enums"]["checklist_template_scope"]
          tasks: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          flow_type: Database["public"]["Enums"]["checklist_template_flow"]
          id?: string
          scope: Database["public"]["Enums"]["checklist_template_scope"]
          tasks?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          flow_type?: Database["public"]["Enums"]["checklist_template_flow"]
          id?: string
          scope?: Database["public"]["Enums"]["checklist_template_scope"]
          tasks?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_resources: {
        Row: {
          collection_id: string
          created_at: string
          display_order: number | null
          id: string
          resource_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          resource_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_resources_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "resource_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      company_calendar_event_sync: {
        Row: {
          all_day: boolean
          created_at: string
          end_time: string
          first_seen_at: string
          google_event_id: string
          html_link: string | null
          last_seen_at: string
          location: string | null
          notification_sent_at: string | null
          source_created_at: string | null
          start_time: string
          summary: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          end_time: string
          first_seen_at?: string
          google_event_id: string
          html_link?: string | null
          last_seen_at?: string
          location?: string | null
          notification_sent_at?: string | null
          source_created_at?: string | null
          start_time: string
          summary: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          end_time?: string
          first_seen_at?: string
          google_event_id?: string
          html_link?: string | null
          last_seen_at?: string
          location?: string | null
          notification_sent_at?: string | null
          source_created_at?: string | null
          start_time?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_calendar_sync_state: {
        Row: {
          created_at: string
          id: boolean
          initialized_at: string | null
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          initialized_at?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          initialized_at?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_events: {
        Row: {
          all_day: boolean
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          created_by: string
          deleted_at: string | null
          department_id: string | null
          description: string | null
          end_time: string
          id: string
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          created_by: string
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          end_time: string
          id?: string
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          head_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          head_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          head_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_confidential: boolean
          mime_type: string | null
          notes: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean
          mime_type?: string | null
          notes?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean
          mime_type?: string | null
          notes?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_banking_info: {
        Row: {
          account_holder_name: string
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          country_code: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          employee_id: string
          iban: string | null
          id: string
          is_verified: boolean | null
          routing_number: string | null
          swift_code: string | null
          updated_at: string
          verified_at: string | null
          wise_recipient_id: string | null
        }
        Insert: {
          account_holder_name: string
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          employee_id: string
          iban?: string | null
          id?: string
          is_verified?: boolean | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string
          verified_at?: string | null
          wise_recipient_id?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          employee_id?: string
          iban?: string | null
          id?: string
          is_verified?: boolean | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string
          verified_at?: string | null
          wise_recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_banking_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_banking_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_banking_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          birthday: string | null
          city: string | null
          company_email: string | null
          created_at: string
          created_by: string | null
          date_hired: string
          deleted_at: string | null
          department: string
          division: string | null
          education: string | null
          emergency_contact_country_code: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          employee_number: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          id: string
          immediate_head: string | null
          last_name: string
          linkedin_profile_url: string | null
          manual_probation_status: string | null
          middle_name: string | null
          nationality: string | null
          payment_account_name: string | null
          payment_account_number: string | null
          payment_address: string | null
          payment_city: string | null
          payment_email: string | null
          payment_phone_number: string | null
          payment_province: string | null
          payment_zipcode: string | null
          payroll_account_name: string | null
          payroll_account_number: string | null
          personal_email: string | null
          phone: string | null
          phone_country_code: string | null
          position: string
          postal_code: string | null
          probation_end_date: string | null
          province: string | null
          updated_at: string
          user_id: string
          work_arrangement: Database["public"]["Enums"]["work_arrangement"]
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          city?: string | null
          company_email?: string | null
          created_at?: string
          created_by?: string | null
          date_hired: string
          deleted_at?: string | null
          department: string
          division?: string | null
          education?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          employee_number: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          id?: string
          immediate_head?: string | null
          last_name: string
          linkedin_profile_url?: string | null
          manual_probation_status?: string | null
          middle_name?: string | null
          nationality?: string | null
          payment_account_name?: string | null
          payment_account_number?: string | null
          payment_address?: string | null
          payment_city?: string | null
          payment_email?: string | null
          payment_phone_number?: string | null
          payment_province?: string | null
          payment_zipcode?: string | null
          payroll_account_name?: string | null
          payroll_account_number?: string | null
          personal_email?: string | null
          phone?: string | null
          phone_country_code?: string | null
          position: string
          postal_code?: string | null
          probation_end_date?: string | null
          province?: string | null
          updated_at?: string
          user_id: string
          work_arrangement: Database["public"]["Enums"]["work_arrangement"]
        }
        Update: {
          address?: string | null
          birthday?: string | null
          city?: string | null
          company_email?: string | null
          created_at?: string
          created_by?: string | null
          date_hired?: string
          deleted_at?: string | null
          department?: string
          division?: string | null
          education?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          employee_number?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name?: string
          id?: string
          immediate_head?: string | null
          last_name?: string
          linkedin_profile_url?: string | null
          manual_probation_status?: string | null
          middle_name?: string | null
          nationality?: string | null
          payment_account_name?: string | null
          payment_account_number?: string | null
          payment_address?: string | null
          payment_city?: string | null
          payment_email?: string | null
          payment_phone_number?: string | null
          payment_province?: string | null
          payment_zipcode?: string | null
          payroll_account_name?: string | null
          payroll_account_number?: string | null
          personal_email?: string | null
          phone?: string | null
          phone_country_code?: string | null
          position?: string
          postal_code?: string | null
          probation_end_date?: string | null
          province?: string | null
          updated_at?: string
          user_id?: string
          work_arrangement?: Database["public"]["Enums"]["work_arrangement"]
        }
        Relationships: [
          {
            foreignKeyName: "employees_immediate_head_fkey"
            columns: ["immediate_head"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_immediate_head_fkey"
            columns: ["immediate_head"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_immediate_head_fkey"
            columns: ["immediate_head"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          base_currency: string
          created_at: string
          fetched_at: string
          id: string
          rates: Json
        }
        Insert: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rates: Json
        }
        Update: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rates?: Json
        }
        Relationships: []
      }
      intern_daily_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          challenges: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          hours_worked: number
          id: string
          internship_id: string
          is_approved: boolean
          learnings: string | null
          log_date: string
          status: string
          supervisor_notes: string | null
          tasks_completed: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          challenges?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hours_worked: number
          id?: string
          internship_id: string
          is_approved?: boolean
          learnings?: string | null
          log_date: string
          status?: string
          supervisor_notes?: string | null
          tasks_completed: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          challenges?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hours_worked?: number
          id?: string
          internship_id?: string
          is_approved?: boolean
          learnings?: string | null
          log_date?: string
          status?: string
          supervisor_notes?: string | null
          tasks_completed?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_daily_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_daily_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_daily_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_daily_logs_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["internship_id"]
          },
          {
            foreignKeyName: "intern_daily_logs_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      internships: {
        Row: {
          completed_hours: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string
          division: string | null
          employee_id: string
          end_date: string
          id: string
          program: string | null
          required_hours: number
          school: string | null
          start_date: string
          status: Database["public"]["Enums"]["internship_status"]
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          completed_hours?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department: string
          division?: string | null
          employee_id: string
          end_date: string
          id?: string
          program?: string | null
          required_hours?: number
          school?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["internship_status"]
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_hours?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string
          division?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          program?: string | null
          required_hours?: number
          school?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["internship_status"]
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internships_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "internships_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "internships_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "internships_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "internships_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          converted_amount: number | null
          created_at: string
          created_by: string | null
          deductions: number | null
          deleted_at: string | null
          employee_id: string
          exchange_rate: number | null
          gross_amount: number
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          invoice_number: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          source_currency: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          submitted_at: string | null
          target_currency: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          converted_amount?: number | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          deleted_at?: string | null
          employee_id: string
          exchange_rate?: number | null
          gross_amount: number
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          invoice_number: string
          net_amount: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          source_currency?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string | null
          target_currency?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          converted_amount?: number | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          deleted_at?: string | null
          employee_id?: string
          exchange_rate?: number | null
          gross_amount?: number
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          invoice_number?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end?: string
          period_start?: string
          source_currency?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string | null
          target_currency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      job_applications: {
        Row: {
          ai_evaluated_at: string | null
          ai_evaluation_model: string | null
          ai_evaluation_status: string
          ai_executive_summary: string | null
          ai_match_score: number | null
          ai_missing_requirements: Json | null
          ai_top_strengths: Json | null
          cover_letter: string | null
          created_at: string
          cv_url: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          job_posting_id: string | null
          notes: string | null
          parsed_resume_markdown: string | null
          phone: string | null
          resume_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_evaluated_at?: string | null
          ai_evaluation_model?: string | null
          ai_evaluation_status?: string
          ai_executive_summary?: string | null
          ai_match_score?: number | null
          ai_missing_requirements?: Json | null
          ai_top_strengths?: Json | null
          cover_letter?: string | null
          created_at?: string
          cv_url: string
          deleted_at?: string | null
          email: string
          full_name: string
          id?: string
          job_posting_id?: string | null
          notes?: string | null
          parsed_resume_markdown?: string | null
          phone?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_evaluated_at?: string | null
          ai_evaluation_model?: string | null
          ai_evaluation_status?: string
          ai_executive_summary?: string | null
          ai_match_score?: number | null
          ai_missing_requirements?: Json | null
          ai_top_strengths?: Json | null
          cover_letter?: string | null
          created_at?: string
          cv_url?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          job_posting_id?: string | null
          notes?: string | null
          parsed_resume_markdown?: string | null
          phone?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          benefits: string | null
          business_unit_id: string | null
          closes_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string | null
          description: string
          employment_type: string | null
          id: string
          is_active: boolean
          location: string | null
          published_at: string | null
          requirements: string | null
          salary_range: string | null
          title: string
          updated_at: string
        }
        Insert: {
          benefits?: string | null
          business_unit_id?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          description: string
          employment_type?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          published_at?: string | null
          requirements?: string | null
          salary_range?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          benefits?: string | null
          business_unit_id?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          description?: string
          employment_type?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          published_at?: string | null
          requirements?: string | null
          salary_range?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requisitions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          filled_headcount: number
          id: string
          job_posting_id: string | null
          status: string
          total_headcount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          filled_headcount?: number
          id?: string
          job_posting_id?: string | null
          status?: string
          total_headcount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          filled_headcount?: number
          id?: string
          job_posting_id?: string | null
          status?: string
          total_headcount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requisitions_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string
          id: string
          metadata: Json | null
          source_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          embedding: string
          id?: string
          metadata?: Json | null
          source_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string
          id?: string
          metadata?: Json | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_knowledge_embeddings_knowledge_sources_source_id"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_source_versions: {
        Row: {
          change_summary: string | null
          changed_by: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          source_id: string
          title: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_by: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_id: string
          title: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_source_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "knowledge_source_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "knowledge_source_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_source_versions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          access_level: string | null
          content: string | null
          created_at: string
          created_by: string | null
          current_version: number | null
          deleted_at: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean
          metadata: Json | null
          mime_type: string | null
          processing_status: string | null
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          access_level?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          mime_type?: string | null
          processing_status?: string | null
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          tags?: string[] | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          access_level?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          mime_type?: string | null
          processing_status?: string | null
          source_type?: Database["public"]["Enums"]["knowledge_source_type"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      kpi_evidence: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          evidence_type: string
          file_name: string | null
          file_size: number | null
          id: string
          kpi_id: string
          label: string | null
          mime_type: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          evidence_type: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          kpi_id: string
          label?: string | null
          mime_type?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          evidence_type?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          kpi_id?: string
          label?: string | null
          mime_type?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_evidence_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kpi_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kpi_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          admin_comments: string | null
          admin_rating: string | null
          created_at: string
          current_value: number | null
          cycle_id: string | null
          employee_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          kpi_type: string
          name: string
          period_end: string
          period_start: string
          progress_pct: number | null
          rubric_1: string | null
          rubric_2: string | null
          rubric_3: string | null
          rubric_4: string | null
          self_rating: number | null
          status: string | null
          target_value: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          current_value?: number | null
          cycle_id?: string | null
          employee_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          kpi_type?: string
          name: string
          period_end: string
          period_start: string
          progress_pct?: number | null
          rubric_1?: string | null
          rubric_2?: string | null
          rubric_3?: string | null
          rubric_4?: string | null
          self_rating?: number | null
          status?: string | null
          target_value: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          current_value?: number | null
          cycle_id?: string | null
          employee_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          kpi_type?: string
          name?: string
          period_end?: string
          period_start?: string
          progress_pct?: number | null
          rubric_1?: string | null
          rubric_2?: string | null
          rubric_3?: string | null
          rubric_4?: string | null
          self_rating?: number | null
          status?: string | null
          target_value?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding: {
        Row: {
          created_at: string
          deleted_at: string | null
          employee_id: string
          exit_interview_date: string | null
          exit_interview_notes: string | null
          exit_type: Database["public"]["Enums"]["exit_type"]
          id: string
          initiated_by: string
          last_working_day: string
          status: Database["public"]["Enums"]["offboarding_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          employee_id: string
          exit_interview_date?: string | null
          exit_interview_notes?: string | null
          exit_type: Database["public"]["Enums"]["exit_type"]
          id?: string
          initiated_by: string
          last_working_day: string
          status?: Database["public"]["Enums"]["offboarding_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          employee_id?: string
          exit_interview_date?: string | null
          exit_interview_notes?: string | null
          exit_type?: Database["public"]["Enums"]["exit_type"]
          id?: string
          initiated_by?: string
          last_working_day?: string
          status?: Database["public"]["Enums"]["offboarding_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "offboarding_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "offboarding_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          offboarding_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          offboarding_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          offboarding_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_tasks_offboarding_id_fkey"
            columns: ["offboarding_id"]
            isOneToOne: false
            referencedRelation: "offboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_targets: {
        Row: {
          admin_comments: string | null
          admin_rating: string | null
          created_at: string
          current_value: number | null
          cycle_id: string | null
          deleted_at: string | null
          description: string | null
          employee_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          metric_type: Database["public"]["Enums"]["target_metric_type"]
          name: string
          okr_id: string
          rubric_1: string | null
          rubric_2: string | null
          rubric_3: string | null
          rubric_4: string | null
          self_rating: number | null
          sort_order: number | null
          start_value: number | null
          target_value: number
          unit: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          current_value?: number | null
          cycle_id?: string | null
          deleted_at?: string | null
          description?: string | null
          employee_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          metric_type?: Database["public"]["Enums"]["target_metric_type"]
          name: string
          okr_id: string
          rubric_1?: string | null
          rubric_2?: string | null
          rubric_3?: string | null
          rubric_4?: string | null
          self_rating?: number | null
          sort_order?: number | null
          start_value?: number | null
          target_value: number
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          current_value?: number | null
          cycle_id?: string | null
          deleted_at?: string | null
          description?: string | null
          employee_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          metric_type?: Database["public"]["Enums"]["target_metric_type"]
          name?: string
          okr_id?: string
          rubric_1?: string | null
          rubric_2?: string | null
          rubric_3?: string | null
          rubric_4?: string | null
          self_rating?: number | null
          sort_order?: number | null
          start_value?: number | null
          target_value?: number
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_targets_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "okr_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "okr_targets_okr_id_fkey"
            columns: ["okr_id"]
            isOneToOne: false
            referencedRelation: "okrs"
            referencedColumns: ["id"]
          },
        ]
      }
      okrs: {
        Row: {
          admin_comments: string | null
          admin_rating: string | null
          created_at: string
          cycle_id: string | null
          description: string | null
          employee_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          key_results: Json
          objective: string
          progress: number | null
          status: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          employee_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          key_results?: Json
          objective: string
          progress?: number | null
          status?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          employee_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          key_results?: Json
          objective?: string
          progress?: number | null
          status?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "okrs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okrs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "okrs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okrs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      onboarding_checklists: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "onboarding_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      onboarding_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["onboarding_document_type"]
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          onboarding_profile_id: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["onboarding_document_type"]
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          onboarding_profile_id: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["onboarding_document_type"]
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          onboarding_profile_id?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documents_onboarding_profile_id_fkey"
            columns: ["onboarding_profile_id"]
            isOneToOne: false
            referencedRelation: "onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_profiles: {
        Row: {
          address: string | null
          age: number | null
          birthday: string | null
          company_email: string | null
          completed_at: string | null
          contact_country_code: string | null
          contact_number: string | null
          created_at: string
          current_step: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at: string | null
          department_id: string | null
          division_id: string | null
          education: string | null
          email_address: string | null
          emergency_contact_country_code: string | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          first_name: string | null
          id: string
          invite_probation_auto_90: boolean
          invite_probation_end_date: string | null
          invite_probation_mode: string
          is_completed: boolean
          last_name: string | null
          linkedin_profile_url: string | null
          major: string | null
          middle_name: string | null
          nationality: string | null
          payment_account_name: string | null
          payment_account_number: string | null
          payment_address: string | null
          payment_bank_id: string | null
          payment_bank_name: string | null
          payment_city: string | null
          payment_country_code: string | null
          payment_email: string | null
          payment_phone_country_code: string | null
          payment_phone_number: string | null
          payment_province: string | null
          payment_zipcode: string | null
          personal_email: string | null
          position: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_count: number
          rejection_notes: string | null
          review_state: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          birthday?: string | null
          company_email?: string | null
          completed_at?: string | null
          contact_country_code?: string | null
          contact_number?: string | null
          created_at?: string
          current_step?: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at?: string | null
          department_id?: string | null
          division_id?: string | null
          education?: string | null
          email_address?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          id?: string
          invite_probation_auto_90?: boolean
          invite_probation_end_date?: string | null
          invite_probation_mode?: string
          is_completed?: boolean
          last_name?: string | null
          linkedin_profile_url?: string | null
          major?: string | null
          middle_name?: string | null
          nationality?: string | null
          payment_account_name?: string | null
          payment_account_number?: string | null
          payment_address?: string | null
          payment_bank_id?: string | null
          payment_bank_name?: string | null
          payment_city?: string | null
          payment_country_code?: string | null
          payment_email?: string | null
          payment_phone_country_code?: string | null
          payment_phone_number?: string | null
          payment_province?: string | null
          payment_zipcode?: string | null
          personal_email?: string | null
          position?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_count?: number
          rejection_notes?: string | null
          review_state?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age?: number | null
          birthday?: string | null
          company_email?: string | null
          completed_at?: string | null
          contact_country_code?: string | null
          contact_number?: string | null
          created_at?: string
          current_step?: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at?: string | null
          department_id?: string | null
          division_id?: string | null
          education?: string | null
          email_address?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          id?: string
          invite_probation_auto_90?: boolean
          invite_probation_end_date?: string | null
          invite_probation_mode?: string
          is_completed?: boolean
          last_name?: string | null
          linkedin_profile_url?: string | null
          major?: string | null
          middle_name?: string | null
          nationality?: string | null
          payment_account_name?: string | null
          payment_account_number?: string | null
          payment_address?: string | null
          payment_bank_id?: string | null
          payment_bank_name?: string | null
          payment_city?: string | null
          payment_country_code?: string | null
          payment_email?: string | null
          payment_phone_country_code?: string | null
          payment_phone_number?: string | null
          payment_province?: string | null
          payment_zipcode?: string | null
          personal_email?: string | null
          position?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_count?: number
          rejection_notes?: string | null
          review_state?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_profiles_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_profiles_payment_bank_id_fkey"
            columns: ["payment_bank_id"]
            isOneToOne: false
            referencedRelation: "bank_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          checklist_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_days_from_start: number | null
          id: string
          is_completed: boolean | null
          is_required: boolean | null
          reference_url: string | null
          requires_submission: boolean
          submission_description: string | null
          submission_label: string | null
          submission_type: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          checklist_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_days_from_start?: number | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          reference_url?: string | null
          requires_submission?: boolean
          submission_description?: string | null
          submission_label?: string | null
          submission_type?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          checklist_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_days_from_start?: number | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          reference_url?: string | null
          requires_submission?: boolean
          submission_description?: string | null
          submission_label?: string | null
          submission_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          completed_at: string | null
          created_at: string
          cycle_id: string
          employee_id: string
          final_rating: number | null
          goals_for_next_period: string | null
          id: string
          manager_comments: string | null
          manager_rating: number | null
          reviewer_id: string | null
          self_comments: string | null
          self_rating: number | null
          status: Database["public"]["Enums"]["review_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          cycle_id: string
          employee_id: string
          final_rating?: number | null
          goals_for_next_period?: string | null
          id?: string
          manager_comments?: string | null
          manager_rating?: number | null
          reviewer_id?: string | null
          self_comments?: string | null
          self_rating?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          cycle_id?: string
          employee_id?: string
          final_rating?: number | null
          goals_for_next_period?: string | null
          id?: string
          manager_comments?: string | null
          manager_rating?: number | null
          reviewer_id?: string | null
          self_comments?: string | null
          self_rating?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_change_requests: {
        Row: {
          changes: Json
          created_at: string
          deleted_at: string | null
          employee_id: string
          id: string
          requested_at: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["profile_change_status"]
          updated_at: string
        }
        Insert: {
          changes: Json
          created_at?: string
          deleted_at?: string | null
          employee_id: string
          id?: string
          requested_at?: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["profile_change_status"]
          updated_at?: string
        }
        Update: {
          changes?: Json
          created_at?: string
          deleted_at?: string | null
          employee_id?: string
          id?: string
          requested_at?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["profile_change_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "profile_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      public_inquiries: {
        Row: {
          business_unit_id: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_inquiries_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      query_cache: {
        Row: {
          created_at: string
          expires_at: string
          hit_count: number
          id: string
          query_embedding: string
          query_text: string
          response_text: string
          source_citations: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hit_count?: number
          id?: string
          query_embedding: string
          query_text: string
          response_text: string
          source_citations?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hit_count?: number
          id?: string
          query_embedding?: string
          query_text?: string
          response_text?: string
          source_citations?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      report_metrics: {
        Row: {
          created_at: string
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          notes: string | null
          report_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          notes?: string | null
          report_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          notes?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_metrics_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_metrics_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "root_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_id: string
          hierarchy_path: string[] | null
          id: string
          notes: string | null
          parent_report_id: string | null
          period_end: string
          period_start: string
          report_group: string | null
          report_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id: string
          hierarchy_path?: string[] | null
          id?: string
          notes?: string | null
          parent_report_id?: string | null
          period_end: string
          period_start: string
          report_group?: string | null
          report_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string
          hierarchy_path?: string[] | null
          id?: string
          notes?: string | null
          parent_report_id?: string | null
          period_end?: string
          period_start?: string
          report_group?: string | null
          report_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "reports_parent_report_id_fkey"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_parent_report_id_fkey"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "root_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_bookmarks: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_bookmarks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_collections: {
        Row: {
          author_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          target_departments: string[] | null
          thumbnail_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          target_departments?: string[] | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          target_departments?: string[] | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_collections_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_collections_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_collections_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_views: {
        Row: {
          completed: boolean | null
          duration_seconds: number | null
          id: string
          resource_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          completed?: boolean | null
          duration_seconds?: number | null
          id?: string
          resource_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          completed?: boolean | null
          duration_seconds?: number | null
          id?: string
          resource_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_views_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          access_level:
            | Database["public"]["Enums"]["resource_access_level"]
            | null
          author_id: string
          bookmark_count: number | null
          category: Database["public"]["Enums"]["resource_category"]
          category_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          display_order: number | null
          download_count: number | null
          duration_seconds: number | null
          excerpt: string | null
          expires_at: string | null
          external_url: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_featured: boolean | null
          is_pinned: boolean | null
          is_public: boolean | null
          mime_type: string | null
          previous_version_id: string | null
          published_at: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          status: Database["public"]["Enums"]["resource_status"]
          subcategory: string | null
          tags: string[] | null
          target_departments: string[] | null
          target_employees: string[] | null
          target_roles: Database["public"]["Enums"]["user_role"][] | null
          thumbnail_path: string | null
          title: string
          updated_at: string
          version: number | null
          view_count: number | null
        }
        Insert: {
          access_level?:
            | Database["public"]["Enums"]["resource_access_level"]
            | null
          author_id: string
          bookmark_count?: number | null
          category: Database["public"]["Enums"]["resource_category"]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          download_count?: number | null
          duration_seconds?: number | null
          excerpt?: string | null
          expires_at?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_public?: boolean | null
          mime_type?: string | null
          previous_version_id?: string | null
          published_at?: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          status?: Database["public"]["Enums"]["resource_status"]
          subcategory?: string | null
          tags?: string[] | null
          target_departments?: string[] | null
          target_employees?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string
          version?: number | null
          view_count?: number | null
        }
        Update: {
          access_level?:
            | Database["public"]["Enums"]["resource_access_level"]
            | null
          author_id?: string
          bookmark_count?: number | null
          category?: Database["public"]["Enums"]["resource_category"]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          download_count?: number | null
          duration_seconds?: number | null
          excerpt?: string | null
          expires_at?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_public?: boolean | null
          mime_type?: string | null
          previous_version_id?: string | null
          published_at?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          status?: Database["public"]["Enums"]["resource_status"]
          subcategory?: string | null
          tags?: string[] | null
          target_departments?: string[] | null
          target_employees?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          version?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          kpi_submission_deadline: string | null
          manager_review_deadline: string | null
          name: string
          okr_submission_deadline: string | null
          self_review_deadline: string | null
          start_date: string
          status: Database["public"]["Enums"]["review_cycle_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          kpi_submission_deadline?: string | null
          manager_review_deadline?: string | null
          name: string
          okr_submission_deadline?: string | null
          self_review_deadline?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["review_cycle_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          kpi_submission_deadline?: string | null
          manager_review_deadline?: string | null
          name?: string
          okr_submission_deadline?: string | null
          self_review_deadline?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["review_cycle_status"]
          updated_at?: string
        }
        Relationships: []
      }
      role_kpi_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          kpi_name: string
          kpi_unit: string | null
          kpi_value: number
          metadata: Json | null
          notes: string | null
          role_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          kpi_name: string
          kpi_unit?: string | null
          kpi_value: number
          metadata?: Json | null
          notes?: string | null
          role_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          kpi_name?: string
          kpi_unit?: string | null
          kpi_value?: number
          metadata?: Json | null
          notes?: string | null
          role_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_kpi_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "role_kpi_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "role_kpi_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      standup_recordings: {
        Row: {
          attendees: string[] | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          duration_seconds: number | null
          file_path: string
          file_size: number | null
          id: string
          recording_date: string
          summary: string | null
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          file_path: string
          file_size?: number | null
          id?: string
          recording_date: string
          summary?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          file_path?: string
          file_size?: number | null
          id?: string
          recording_date?: string
          summary?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      standup_topics: {
        Row: {
          created_at: string
          id: string
          recording_id: string
          timestamp_end: number | null
          timestamp_start: number | null
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          recording_id: string
          timestamp_end?: number | null
          timestamp_start?: number | null
          topic: string
        }
        Update: {
          created_at?: string
          id?: string
          recording_id?: string
          timestamp_end?: number | null
          timestamp_start?: number | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "standup_topics_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "standup_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_proofs: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          label: string | null
          proof_type: string
          submitted_by: string
          task_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string | null
          proof_type: string
          submitted_by: string
          task_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string | null
          proof_type?: string
          submitted_by?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_proofs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_proofs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_proofs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_proofs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_handlers: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          is_active: boolean
          team: Database["public"]["Enums"]["ticket_team"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          team: Database["public"]["Enums"]["ticket_team"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          team?: Database["public"]["Enums"]["ticket_team"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_handlers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_handlers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_handlers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_handlers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_handlers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_handlers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          expected_behavior: string | null
          feature_area:
            | Database["public"]["Enums"]["ticket_feature_area"]
            | null
          has_attachments: boolean
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_summary: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          steps_to_reproduce: string | null
          submitted_by: string
          team: Database["public"]["Enums"]["ticket_team"]
          title: string
          triaged_at: string | null
          triaged_by: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          expected_behavior?: string | null
          feature_area?:
            | Database["public"]["Enums"]["ticket_feature_area"]
            | null
          has_attachments?: boolean
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          steps_to_reproduce?: string | null
          submitted_by: string
          team: Database["public"]["Enums"]["ticket_team"]
          title: string
          triaged_at?: string | null
          triaged_by?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          expected_behavior?: string | null
          feature_area?:
            | Database["public"]["Enums"]["ticket_feature_area"]
            | null
          has_attachments?: boolean
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          steps_to_reproduce?: string | null
          submitted_by?: string
          team?: Database["public"]["Enums"]["ticket_team"]
          title?: string
          triaged_at?: string | null
          triaged_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_metadata: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          role_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          role_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          role_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_role_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_role_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_id: string | null
          division_id: string | null
          id: string
          manager_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          division_id?: string | null
          id: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          division_id?: string | null
          id?: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      website_content: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          metadata: Json | null
          section: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          metadata?: Json | null
          section: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          metadata?: Json | null
          section?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      wise_payments: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_id: string
          error_message: string | null
          exchange_rate: number | null
          fee: number | null
          id: string
          idempotency_key: string
          initiated_by: string
          invoice_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          source_amount: number
          source_currency: string
          target_amount: number | null
          target_currency: string
          updated_at: string
          wise_quote_id: string | null
          wise_recipient_id: string
          wise_transfer_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_id: string
          error_message?: string | null
          exchange_rate?: number | null
          fee?: number | null
          id?: string
          idempotency_key: string
          initiated_by: string
          invoice_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          source_amount: number
          source_currency?: string
          target_amount?: number | null
          target_currency?: string
          updated_at?: string
          wise_quote_id?: string | null
          wise_recipient_id: string
          wise_transfer_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          error_message?: string | null
          exchange_rate?: number | null
          fee?: number | null
          id?: string
          idempotency_key?: string
          initiated_by?: string
          invoice_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          source_amount?: number
          source_currency?: string
          target_amount?: number | null
          target_currency?: string
          updated_at?: string
          wise_quote_id?: string | null
          wise_recipient_id?: string
          wise_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wise_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "wise_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wise_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "wise_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employee_directory: {
        Row: {
          address: string | null
          avatar_url: string | null
          birthday: string | null
          city: string | null
          completed_hours: number | null
          contact_number: string | null
          department_id: string | null
          department_name: string | null
          division_id: string | null
          division_name: string | null
          education: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          employee_id: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          first_name: string | null
          full_name: string | null
          internship_id: string | null
          internship_status:
            | Database["public"]["Enums"]["internship_status"]
            | null
          last_name: string | null
          linkedin_profile_url: string | null
          middle_name: string | null
          nationality: string | null
          payment_account_name: string | null
          payment_account_number: string | null
          payment_address: string | null
          payment_city: string | null
          payment_email: string | null
          payment_phone_number: string | null
          payment_province: string | null
          payment_zipcode: string | null
          pending_changes_count: number | null
          personal_email: string | null
          position: string | null
          postal_code: string | null
          program: string | null
          province: string | null
          required_hours: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          school: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          user_id: string | null
        }
        Relationships: []
      }
      individual_performance_summary: {
        Row: {
          avg_kpi_progress: number | null
          avg_okr_progress: number | null
          completed_kpis: number | null
          completed_okrs: number | null
          department_name: string | null
          employee_id: string | null
          full_name: string | null
          latest_review_date: string | null
          latest_review_rating: number | null
          position: string | null
          total_kpis: number | null
          total_okrs: number | null
          total_reviews: number | null
          user_id: string | null
        }
        Relationships: []
      }
      root_reports: {
        Row: {
          child_count: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          employee_id: string | null
          hierarchy_path: string[] | null
          id: string | null
          notes: string | null
          parent_report_id: string | null
          period_end: string | null
          period_start: string | null
          report_group: string | null
          report_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          review_notes: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          child_count?: never
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          hierarchy_path?: string[] | null
          id?: string | null
          notes?: string | null
          parent_report_id?: string | null
          period_end?: string | null
          period_start?: string | null
          report_group?: string | null
          report_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          child_count?: never
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          hierarchy_path?: string[] | null
          id?: string | null
          notes?: string | null
          parent_report_id?: string | null
          period_end?: string | null
          period_start?: string | null
          report_group?: string | null
          report_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "reports_parent_report_id_fkey"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_parent_report_id_fkey"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "root_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      calculate_okr_progress: {
        Args: {
          p_okr_id: string
        }
        Returns: number
      }
      calculate_okr_progress_from_targets: {
        Args: {
          p_okr_id: string
        }
        Returns: number
      }
      calculate_overall_okr_score: {
        Args: {
          p_employee_id: string
          p_cycle_id?: string
        }
        Returns: number
      }
      calculate_tenure_days: {
        Args: {
          employee_id: string
        }
        Returns: number
      }
      create_job_posting_with_requisition: {
        Args: {
          p_title: string
          p_business_unit_id: string
          p_department: string
          p_location: string
          p_total_headcount: number
          p_employment_type: string
          p_description: string
          p_requirements: string
          p_benefits: string
          p_salary_range: string
          p_is_active: boolean
          p_closes_at: string
        }
        Returns: Json
      }
      get_direct_reports: {
        Args: {
          manager_user_id: string
        }
        Returns: {
          employee_id: string
          user_id: string
          employee_number: string
          full_name: string
          position: string
          department: string
        }[]
      }
      get_employee_by_user_id: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_employees_by_department: {
        Args: {
          dept_name: string
        }
        Returns: {
          employee_id: string
          employee_number: string
          full_name: string
          position: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          date_hired: string
        }[]
      }
      get_knowledge_source_versions: {
        Args: {
          p_source_id: string
        }
        Returns: {
          id: string
          version_number: number
          title: string
          content: string
          changed_by: string
          changed_by_name: string
          change_summary: string
          metadata: Json
          created_at: string
        }[]
      }
      get_report_children: {
        Args: {
          parent_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_id: string
          hierarchy_path: string[] | null
          id: string
          notes: string | null
          parent_report_id: string | null
          period_end: string
          period_start: string
          report_group: string | null
          report_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }[]
      }
      get_report_tree: {
        Args: {
          root_id: string
        }
        Returns: {
          id: string
          parent_report_id: string
          report_type: string
          report_group: string
          hierarchy_path: string[]
          status: string
          period_start: string
          period_end: string
          notes: string
          depth: number
        }[]
      }
      get_resource_category_tree: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          slug: string
          description: string
          icon: string
          parent_id: string
          display_order: number
          is_active: boolean
          depth: number
          resource_count: number
        }[]
      }
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hire_job_application_transaction: {
        Args: {
          application_uuid: string
        }
        Returns: Json
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      increment_cache_hit_count: {
        Args: {
          cache_id: string
        }
        Returns: undefined
      }
      increment_resource_download_count: {
        Args: {
          resource_uuid: string
        }
        Returns: undefined
      }
      invoice_employee_is_owner: {
        Args: {
          p_employee_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_manager_of: {
        Args: {
          manager_id: string
          employee_user_id: string
        }
        Returns: boolean
      }
      is_on_probation: {
        Args: {
          employee_id: string
        }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      match_knowledge_embeddings:
        | {
            Args: {
              query_embedding: string
              match_threshold?: number
              match_count?: number
            }
            Returns: {
              id: string
              source_id: string
              chunk_index: number
              chunk_text: string
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: {
              query_embedding: string
              match_threshold?: number
              match_count?: number
              allowed_access_levels?: string[]
            }
            Returns: {
              id: string
              source_id: string
              chunk_index: number
              chunk_text: string
              metadata: Json
              similarity: number
              source_title: string
            }[]
          }
      match_query_cache: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          max_results?: number
        }
        Returns: {
          id: string
          query_text: string
          response_text: string
          source_citations: Json
          similarity: number
        }[]
      }
      resources_search_vector: {
        Args: {
          title: string
          description: string
          tags: string[]
        }
        Returns: unknown
      }
      restore_knowledge_source_version: {
        Args: {
          p_source_id: string
          p_version_number: number
        }
        Returns: {
          access_level: string | null
          content: string | null
          created_at: string
          created_by: string | null
          current_version: number | null
          deleted_at: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean
          metadata: Json | null
          mime_type: string | null
          processing_status: string | null
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
        }
      }
      soft_delete: {
        Args: {
          table_name: string
          record_id: string
        }
        Returns: boolean
      }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      user_has_any_role:
        | {
            Args: {
              user_id: string
              required_roles: Database["public"]["Enums"]["user_role"][]
            }
            Returns: boolean
          }
        | {
            Args: {
              user_id: string
              required_roles: string[]
            }
            Returns: boolean
          }
      user_has_role: {
        Args: {
          user_id: string
          required_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      user_is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
    }
    Enums: {
      announcement_category:
        | "hr_updates"
        | "benefits"
        | "events"
        | "performance"
        | "training"
        | "policy"
        | "general"
        | "emergency"
      announcement_priority: "low" | "normal" | "high" | "urgent"
      announcement_status:
        | "draft"
        | "scheduled"
        | "published"
        | "expired"
        | "archived"
      checklist_template_flow: "onboarding" | "offboarding"
      checklist_template_scope: "employee" | "intern" | "default"
      document_type:
        | "contract"
        | "id"
        | "certificate"
        | "performance_review"
        | "resume"
        | "medical_record"
        | "tax_document"
        | "nda"
        | "handbook_acknowledgment"
        | "other"
      employment_type: "regular" | "probationary" | "intern" | "project_based"
      event_category:
        | "holiday"
        | "meeting"
        | "deadline"
        | "company"
        | "team"
        | "training"
      exit_type:
        | "resignation"
        | "termination"
        | "end_of_contract"
        | "retirement"
      internship_status: "active" | "completed" | "terminated" | "converted"
      invoice_status: "draft" | "submitted" | "approved" | "paid" | "rejected"
      knowledge_source_type: "pdf" | "docx" | "url" | "manual" | "txt"
      notification_type:
        | "task_assigned"
        | "task_due"
        | "report_submitted"
        | "report_approved"
        | "report_rejected"
        | "invoice_submitted"
        | "invoice_approved"
        | "invoice_rejected"
        | "intern_log_submitted"
        | "intern_log_approved"
        | "onboarding_approved"
        | "onboarding_rejected"
        | "announcement_new"
        | "resource_new"
        | "reminder"
        | "onboarding_step"
        | "probation_update"
        | "system"
      offboarding_status: "initiated" | "in_progress" | "completed"
      onboarding_document_type:
        | "valid_id"
        | "profile_photo"
        | "cv"
        | "birth_certificate"
      onboarding_status: "not_started" | "in_progress" | "completed"
      onboarding_step: "personal_info" | "payment_info" | "documents" | "review"
      payment_method: "wise" | "bank_transfer" | "check" | "other"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      profile_change_status: "pending" | "approved" | "rejected"
      resource_access_level: "full" | "view_only"
      resource_category:
        | "onboarding"
        | "training"
        | "policies"
        | "benefits"
        | "tools"
        | "culture"
        | "department_specific"
        | "forms_templates"
        | "performance"
        | "emergency"
      resource_status: "draft" | "published" | "archived"
      resource_type:
        | "video"
        | "document"
        | "image"
        | "link"
        | "presentation"
        | "interactive"
      review_cycle_status: "draft" | "active" | "completed" | "archived"
      review_status: "pending" | "self_review" | "manager_review" | "completed"
      target_metric_type: "number" | "boolean" | "currency" | "tasks" | "scale"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      ticket_category:
        | "payroll_benefits"
        | "leave_attendance"
        | "employee_records"
        | "onboarding_offboarding"
        | "policy_clarification"
        | "workplace_support"
        | "other_hr"
        | "access_permissions"
        | "bug_report"
        | "performance_issue"
        | "data_issue"
        | "integration_notifications"
        | "hardware_software"
        | "feature_request"
        | "other_it"
      ticket_feature_area:
        | "authentication"
        | "dashboard"
        | "profile"
        | "tasks"
        | "reports"
        | "tickets"
        | "documents"
        | "announcements"
        | "resources"
        | "performance"
        | "payroll"
        | "onboarding"
        | "employee_management"
        | "recruitment"
        | "ai_knowledge"
        | "company_pulse"
        | "mobile_app"
        | "hardware_software"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "new"
        | "triaged"
        | "assigned"
        | "in_progress"
        | "waiting_on_user"
        | "resolved"
        | "closed"
      ticket_team: "hr" | "it"
      user_role: "employee" | "intern" | "admin" | "super_admin"
      user_status:
        | "active"
        | "inactive"
        | "on_leave"
        | "terminated"
        | "pending_onboarding"
        | "awaiting_approval"
      work_arrangement: "part_time" | "full_time"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

