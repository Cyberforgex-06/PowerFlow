export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: number;
          metadata: Json;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: never;
          metadata?: Json;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: never;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bills: {
        Row: {
          billing_period_end: string;
          billing_period_start: string;
          created_at: string;
          customer_id: string;
          due_date: string;
          energy_charge: number;
          fixed_charge: number;
          id: string;
          meter_id: string;
          reading_id: string | null;
          status: Database["public"]["Enums"]["bill_status"];
          tariff_id: string | null;
          tax_amount: number;
          total_amount: number | null;
          units_consumed: number;
        };
        Insert: {
          billing_period_end: string;
          billing_period_start: string;
          created_at?: string;
          customer_id: string;
          due_date: string;
          energy_charge: number;
          fixed_charge?: number;
          id?: string;
          meter_id: string;
          reading_id?: string | null;
          status?: Database["public"]["Enums"]["bill_status"];
          tariff_id?: string | null;
          tax_amount?: number;
          total_amount?: number | null;
          units_consumed: number;
        };
        Update: {
          billing_period_end?: string;
          billing_period_start?: string;
          created_at?: string;
          customer_id?: string;
          due_date?: string;
          energy_charge?: number;
          fixed_charge?: number;
          id?: string;
          meter_id?: string;
          reading_id?: string | null;
          status?: Database["public"]["Enums"]["bill_status"];
          tariff_id?: string | null;
          tax_amount?: number;
          total_amount?: number | null;
          units_consumed?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bills_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_meter_id_fkey";
            columns: ["meter_id"];
            isOneToOne: false;
            referencedRelation: "meters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_reading_id_fkey";
            columns: ["reading_id"];
            isOneToOne: false;
            referencedRelation: "meter_readings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_tariff_id_fkey";
            columns: ["tariff_id"];
            isOneToOne: false;
            referencedRelation: "tariffs";
            referencedColumns: ["id"];
          },
        ];
      };
      meter_readings: {
        Row: {
          created_at: string;
          current_reading: number;
          id: string;
          meter_id: string;
          previous_reading: number;
          reading_date: string;
          recorded_by: string | null;
          units_consumed: number | null;
        };
        Insert: {
          created_at?: string;
          current_reading: number;
          id?: string;
          meter_id: string;
          previous_reading: number;
          reading_date?: string;
          recorded_by?: string | null;
          units_consumed?: number | null;
        };
        Update: {
          created_at?: string;
          current_reading?: number;
          id?: string;
          meter_id?: string;
          previous_reading?: number;
          reading_date?: string;
          recorded_by?: string | null;
          units_consumed?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "meter_readings_meter_id_fkey";
            columns: ["meter_id"];
            isOneToOne: false;
            referencedRelation: "meters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meter_readings_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meters: {
        Row: {
          address: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          meter_number: string;
          meter_type: string;
          status: Database["public"]["Enums"]["meter_status"];
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          meter_number: string;
          meter_type?: string;
          status?: Database["public"]["Enums"]["meter_status"];
        };
        Update: {
          address?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          meter_number?: string;
          meter_type?: string;
          status?: Database["public"]["Enums"]["meter_status"];
        };
        Relationships: [
          {
            foreignKeyName: "meters_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          bill_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          paid_at: string | null;
          payment_method: string | null;
          reference: string;
          status: Database["public"]["Enums"]["payment_status"];
        };
        Insert: {
          amount: number;
          bill_id: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          reference: string;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Update: {
          amount?: number;
          bill_id?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          reference?: string;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payments_bill_id_fkey";
            columns: ["bill_id"];
            isOneToOne: false;
            referencedRelation: "bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      security_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: number;
          metadata: Json;
          severity: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: never;
          metadata?: Json;
          severity?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: never;
          metadata?: Json;
          severity?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tariffs: {
        Row: {
          active: boolean;
          effective_from: string;
          effective_to: string | null;
          fixed_charge: number;
          id: string;
          name: string;
          rate_per_kwh: number;
          tax_rate: number;
        };
        Insert: {
          active?: boolean;
          effective_from: string;
          effective_to?: string | null;
          fixed_charge?: number;
          id?: string;
          name: string;
          rate_per_kwh: number;
          tax_rate?: number;
        };
        Update: {
          active?: boolean;
          effective_from?: string;
          effective_to?: string | null;
          fixed_charge?: number;
          id?: string;
          name?: string;
          rate_per_kwh?: number;
          tax_rate?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      issue_bill: {
        Args: {
          p_meter_id: string;
          p_tariff_id: string;
          p_previous: number;
          p_current: number;
          p_start: string;
          p_end: string;
          p_due: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: "customer" | "admin";
      bill_status: "pending" | "paid" | "overdue" | "cancelled";
      meter_status: "active" | "inactive" | "suspended";
      payment_status: "pending" | "successful" | "failed" | "refunded";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "admin"],
      bill_status: ["pending", "paid", "overdue", "cancelled"],
      meter_status: ["active", "inactive", "suspended"],
      payment_status: ["pending", "successful", "failed", "refunded"],
    },
  },
} as const;
