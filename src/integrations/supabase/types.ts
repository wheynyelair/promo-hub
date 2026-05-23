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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      branch_settings: {
        Row: {
          branch: Database["public"]["Enums"]["branch_code"]
          gestor_nome: string | null
          gestor_telefone: string | null
          manager_name: string | null
          manager_phone: string | null
          suporte_contato: string | null
          updated_at: string
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch_code"]
          gestor_nome?: string | null
          gestor_telefone?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          suporte_contato?: string | null
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch_code"]
          gestor_nome?: string | null
          gestor_telefone?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          suporte_contato?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          cover_url: string | null
          id: boolean
          logo_url: string | null
          updated_at: string
          welcome_text: string | null
        }
        Insert: {
          cover_url?: string | null
          id?: boolean
          logo_url?: string | null
          updated_at?: string
          welcome_text?: string | null
        }
        Update: {
          cover_url?: string | null
          id?: boolean
          logo_url?: string | null
          updated_at?: string
          welcome_text?: string | null
        }
        Relationships: []
      }
      engagement_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lamina_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lamina_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lamina_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_lamina_id_fkey"
            columns: ["lamina_id"]
            isOneToOne: false
            referencedRelation: "laminas"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          lamina_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lamina_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          lamina_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_lamina_id_fkey"
            columns: ["lamina_id"]
            isOneToOne: false
            referencedRelation: "laminas"
            referencedColumns: ["id"]
          },
        ]
      }
      laminas: {
        Row: {
          badges: string[]
          branch: Database["public"]["Enums"]["branch_code"]
          branches: Database["public"]["Enums"]["branch_code"][]
          category: Database["public"]["Enums"]["lamina_category"]
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number
          ean: string | null
          expires_at: string
          flash_until: string | null
          id: string
          image_url: string
          industry: string | null
          price_from: number | null
          price_to: number | null
          share_count: number
          starts_at: string
          storage_path: string
          title: string
          view_count: number
        }
        Insert: {
          badges?: string[]
          branch: Database["public"]["Enums"]["branch_code"]
          branches?: Database["public"]["Enums"]["branch_code"][]
          category?: Database["public"]["Enums"]["lamina_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number
          ean?: string | null
          expires_at: string
          flash_until?: string | null
          id?: string
          image_url: string
          industry?: string | null
          price_from?: number | null
          price_to?: number | null
          share_count?: number
          starts_at?: string
          storage_path: string
          title: string
          view_count?: number
        }
        Update: {
          badges?: string[]
          branch?: Database["public"]["Enums"]["branch_code"]
          branches?: Database["public"]["Enums"]["branch_code"][]
          category?: Database["public"]["Enums"]["lamina_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number
          ean?: string | null
          expires_at?: string
          flash_until?: string | null
          id?: string
          image_url?: string
          industry?: string | null
          price_from?: number | null
          price_to?: number | null
          share_count?: number
          starts_at?: string
          storage_path?: string
          title?: string
          view_count?: number
        }
        Relationships: []
      }
      price_base: {
        Row: {
          branch: Database["public"]["Enums"]["branch_code"] | null
          codfilial: string
          codprod: string
          departamento: string | null
          descricao: string
          ean: string | null
          id: string
          linha: string | null
          marca: string | null
          preco_final: number | null
          ptabela: number | null
          secao: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch_code"] | null
          codfilial: string
          codprod: string
          departamento?: string | null
          descricao: string
          ean?: string | null
          id?: string
          linha?: string | null
          marca?: string | null
          preco_final?: number | null
          ptabela?: number | null
          secao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch_code"] | null
          codfilial?: string
          codprod?: string
          departamento?: string | null
          descricao?: string
          ean?: string | null
          id?: string
          linha?: string | null
          marca?: string | null
          preco_final?: number | null
          ptabela?: number | null
          secao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: Database["public"]["Enums"]["branch_code"]
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          phone: string | null
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch_code"]
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          phone?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch_code"]
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      text_offers: {
        Row: {
          branch: Database["public"]["Enums"]["branch_code"]
          branches: Database["public"]["Enums"]["branch_code"][]
          brand: string | null
          codprod: string | null
          created_at: string
          created_by: string | null
          description: string
          ean: string | null
          expires_at: string
          flash_until: string | null
          id: string
          price: number | null
          starts_at: string
          stock: number | null
          title: string | null
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch_code"]
          branches?: Database["public"]["Enums"]["branch_code"][]
          brand?: string | null
          codprod?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          ean?: string | null
          expires_at: string
          flash_until?: string | null
          id?: string
          price?: number | null
          starts_at?: string
          stock?: number | null
          title?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch_code"]
          branches?: Database["public"]["Enums"]["branch_code"][]
          brand?: string | null
          codprod?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          ean?: string | null
          expires_at?: string
          flash_until?: string | null
          id?: string
          price?: number | null
          starts_at?: string
          stock?: number | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_branch: {
        Args: never
        Returns: Database["public"]["Enums"]["branch_code"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      branch_code: "filial01" | "filial02" | "filial03" | "admin"
      lamina_category: "campanhas" | "acoes" | "compre_ganhe" | "diversos"
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
      branch_code: ["filial01", "filial02", "filial03", "admin"],
      lamina_category: ["campanhas", "acoes", "compre_ganhe", "diversos"],
    },
  },
} as const
