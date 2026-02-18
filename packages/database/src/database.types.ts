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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          ip_address: unknown
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
          id?: string
          ip_address?: unknown
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
          id?: string
          ip_address?: unknown
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          employee_number: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          id: string
          immediate_head: string | null
          last_name: string
          middle_name: string | null
          payroll_account_name: string | null
          payroll_account_number: string | null
          personal_email: string | null
          phone: string | null
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
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          employee_number: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          id?: string
          immediate_head?: string | null
          last_name: string
          middle_name?: string | null
          payroll_account_name?: string | null
          payroll_account_number?: string | null
          personal_email?: string | null
          phone?: string | null
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
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          employee_number?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name?: string
          id?: string
          immediate_head?: string | null
          last_name?: string
          middle_name?: string | null
          payroll_account_name?: string | null
          payroll_account_number?: string | null
          personal_email?: string | null
          phone?: string | null
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
            referencedRelation: "users"
            referencedColumns: ["id"]
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
      eod_reports: {
        Row: {
          created_at: string
          first_name: string | null
          id: number
          last_name: string | null
          text: string | null
        }
        Insert: {
          created_at: string
          first_name?: string | null
          id?: number
          last_name?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: number
          last_name?: string | null
          text?: string | null
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
          supervisor_notes?: string | null
          tasks_completed?: string
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          created_at: string
          created_by: string | null
          deductions: number | null
          deleted_at: string | null
          employee_id: string
          gross_amount: number
          id: string
          invoice_number: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["invoice_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          deleted_at?: string | null
          employee_id: string
          gross_amount: number
          id?: string
          invoice_number: string
          net_amount: number
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          deleted_at?: string | null
          employee_id?: string
          gross_amount?: number
          id?: string
          invoice_number?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "employees"
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
          name: string
          period_end: string
          period_start: string
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
          name: string
          period_end: string
          period_start: string
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
          name?: string
          period_end?: string
          period_start?: string
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
            referencedRelation: "employees"
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
          employee_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          key_results: Json
          objective: string
          progress: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          cycle_id?: string | null
          employee_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          key_results?: Json
          objective: string
          progress?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          cycle_id?: string | null
          employee_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          key_results?: Json
          objective?: string
          progress?: number | null
          status?: string | null
          updated_at?: string
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          contact_number: string | null
          created_at: string
          current_step: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at: string | null
          department_id: string | null
          education: string | null
          email_address: string | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          first_name: string | null
          id: string
          is_completed: boolean
          last_name: string | null
          linkedin_profile_url: string | null
          major: string | null
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
          personal_email: string | null
          position: string | null
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
          contact_number?: string | null
          created_at?: string
          current_step?: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at?: string | null
          department_id?: string | null
          education?: string | null
          email_address?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          id?: string
          is_completed?: boolean
          last_name?: string | null
          linkedin_profile_url?: string | null
          major?: string | null
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
          personal_email?: string | null
          position?: string | null
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
          contact_number?: string | null
          created_at?: string
          current_step?: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at?: string | null
          department_id?: string | null
          education?: string | null
          email_address?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          id?: string
          is_completed?: boolean
          last_name?: string | null
          linkedin_profile_url?: string | null
          major?: string | null
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
          personal_email?: string | null
          position?: string | null
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
            foreignKeyName: "onboarding_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
        ]
      }
      reports: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_id: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
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
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          report_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          report_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          author_id: string
          bookmark_count: number | null
          category: Database["public"]["Enums"]["resource_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          display_order: number | null
          download_count: number | null
          downloads_count: number | null
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
          author_id: string
          bookmark_count?: number | null
          category: Database["public"]["Enums"]["resource_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          download_count?: number | null
          downloads_count?: number | null
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
          title: string
          updated_at?: string
          version?: number | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          bookmark_count?: number | null
          category?: Database["public"]["Enums"]["resource_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          download_count?: number | null
          downloads_count?: number | null
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
            referencedRelation: "users"
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
          manager_review_deadline: string | null
          name: string
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
          manager_review_deadline?: string | null
          name: string
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
          manager_review_deadline?: string | null
          name?: string
          self_review_deadline?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["review_cycle_status"]
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_id: string | null
          id: string
          manager_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          id: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          id?: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      invoice_employee_is_owner: {
        Args: { p_employee_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_any_role: {
        Args: {
          required_roles: Database["public"]["Enums"]["user_role"][]
          user_id: string
        }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          required_role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Returns: boolean
      }
      user_is_admin: { Args: { user_id: string }; Returns: boolean }
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
      internship_status: "active" | "completed" | "terminated" | "converted"
      invoice_status: "draft" | "submitted" | "approved" | "paid" | "rejected"
      onboarding_document_type:
        | "valid_id"
        | "profile_photo"
        | "cv"
        | "birth_certificate"
      onboarding_step: "personal_info" | "payment_info" | "documents" | "review"
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
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      user_role: "employee" | "intern" | "admin" | "super_admin"
      user_status:
        | "active"
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
  public: {
    Enums: {
      announcement_category: [
        "hr_updates",
        "benefits",
        "events",
        "performance",
        "training",
        "policy",
        "general",
        "emergency",
      ],
      announcement_priority: ["low", "normal", "high", "urgent"],
      announcement_status: [
        "draft",
        "scheduled",
        "published",
        "expired",
        "archived",
      ],
      document_type: [
        "contract",
        "id",
        "certificate",
        "performance_review",
        "resume",
        "medical_record",
        "tax_document",
        "nda",
        "handbook_acknowledgment",
        "other",
      ],
      employment_type: ["regular", "probationary", "intern", "project_based"],
      internship_status: ["active", "completed", "terminated", "converted"],
      invoice_status: ["draft", "submitted", "approved", "paid", "rejected"],
      onboarding_document_type: [
        "valid_id",
        "profile_photo",
        "cv",
        "birth_certificate",
      ],
      onboarding_step: ["personal_info", "payment_info", "documents", "review"],
      resource_category: [
        "onboarding",
        "training",
        "policies",
        "benefits",
        "tools",
        "culture",
        "department_specific",
        "forms_templates",
        "performance",
        "emergency",
      ],
      resource_status: ["draft", "published", "archived"],
      resource_type: [
        "video",
        "document",
        "image",
        "link",
        "presentation",
        "interactive",
      ],
      review_cycle_status: ["draft", "active", "completed", "archived"],
      review_status: ["pending", "self_review", "manager_review", "completed"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      user_role: ["employee", "intern", "admin", "super_admin"],
      user_status: [
        "active",
        "on_leave",
        "terminated",
        "pending_onboarding",
        "awaiting_approval",
      ],
      work_arrangement: ["part_time", "full_time"],
    },
  },
} as const
