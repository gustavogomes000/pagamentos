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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      administrativo: {
        Row: {
          assinatura: string | null
          contrato_ate_mes: number | null
          cpf: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
          valor_contrato: number | null
          valor_contrato_meses: number | null
          whatsapp: string | null
        }
        Insert: {
          assinatura?: string | null
          contrato_ate_mes?: number | null
          cpf?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          valor_contrato?: number | null
          valor_contrato_meses?: number | null
          whatsapp?: string | null
        }
        Update: {
          assinatura?: string | null
          contrato_ate_mes?: number | null
          cpf?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          valor_contrato?: number | null
          valor_contrato_meses?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      liderancas: {
        Row: {
          assinatura: string | null
          chave_pix: string | null
          cpf: string | null
          created_at: string
          id: string
          ligacao_politica: string | null
          nome: string
          rede_social: string | null
          regiao: string | null
          retirada_ate_mes: number | null
          retirada_mensal_meses: number | null
          retirada_mensal_valor: number | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          assinatura?: string | null
          chave_pix?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          ligacao_politica?: string | null
          nome: string
          rede_social?: string | null
          regiao?: string | null
          retirada_ate_mes?: number | null
          retirada_mensal_meses?: number | null
          retirada_mensal_valor?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          assinatura?: string | null
          chave_pix?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          ligacao_politica?: string | null
          nome?: string
          rede_social?: string | null
          regiao?: string | null
          retirada_ate_mes?: number | null
          retirada_mensal_meses?: number | null
          retirada_mensal_valor?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          admin_id: string | null
          ano: number
          categoria: string
          created_at: string
          id: string
          lideranca_id: string | null
          mes: number
          observacao: string | null
          suplente_id: string | null
          tipo_pessoa: string | null
          valor: number
        }
        Insert: {
          admin_id?: string | null
          ano: number
          categoria: string
          created_at?: string
          id?: string
          lideranca_id?: string | null
          mes: number
          observacao?: string | null
          suplente_id?: string | null
          tipo_pessoa?: string | null
          valor?: number
        }
        Update: {
          admin_id?: string | null
          ano?: number
          categoria?: string
          created_at?: string
          id?: string
          lideranca_id?: string | null
          mes?: number
          observacao?: string | null
          suplente_id?: string | null
          tipo_pessoa?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_suplente_id_fkey"
            columns: ["suplente_id"]
            isOneToOne: false
            referencedRelation: "suplentes"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          atualizado_em: string | null
          cpf: string
          criado_em: string | null
          data_nascimento: string | null
          email: string | null
          id: string
          instagram: string | null
          municipio: string | null
          nome: string | null
          observacoes_gerais: string | null
          origem: string | null
          outras_redes: string | null
          secao_eleitoral: string | null
          situacao_titulo: string | null
          telefone: string | null
          titulo_eleitor: string | null
          uf: string | null
          whatsapp: string | null
          zona_eleitoral: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cpf: string
          criado_em?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          municipio?: string | null
          nome?: string | null
          observacoes_gerais?: string | null
          origem?: string | null
          outras_redes?: string | null
          secao_eleitoral?: string | null
          situacao_titulo?: string | null
          telefone?: string | null
          titulo_eleitor?: string | null
          uf?: string | null
          whatsapp?: string | null
          zona_eleitoral?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cpf?: string
          criado_em?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          municipio?: string | null
          nome?: string | null
          observacoes_gerais?: string | null
          origem?: string | null
          outras_redes?: string | null
          secao_eleitoral?: string | null
          situacao_titulo?: string | null
          telefone?: string | null
          titulo_eleitor?: string | null
          uf?: string | null
          whatsapp?: string | null
          zona_eleitoral?: string | null
        }
        Relationships: []
      }
      suplentes: {
        Row: {
          ano_eleicao: number | null
          assinatura: string | null
          bairro: string | null
          base_politica: string | null
          cargo_disputado: string | null
          created_at: string
          expectativa_votos: number | null
          fiscais_qtd: number | null
          fiscais_valor_unit: number | null
          id: string
          liderancas_qtd: number | null
          liderancas_valor_unit: number | null
          nome: string
          numero_urna: string | null
          partido: string | null
          plotagem_qtd: number | null
          plotagem_valor_unit: number | null
          regiao_atuacao: string | null
          retirada_mensal_meses: number | null
          retirada_mensal_valor: number | null
          situacao: string | null
          telefone: string | null
          total_campanha: number | null
          total_votos: number | null
          updated_at: string
        }
        Insert: {
          ano_eleicao?: number | null
          assinatura?: string | null
          bairro?: string | null
          base_politica?: string | null
          cargo_disputado?: string | null
          created_at?: string
          expectativa_votos?: number | null
          fiscais_qtd?: number | null
          fiscais_valor_unit?: number | null
          id?: string
          liderancas_qtd?: number | null
          liderancas_valor_unit?: number | null
          nome: string
          numero_urna?: string | null
          partido?: string | null
          plotagem_qtd?: number | null
          plotagem_valor_unit?: number | null
          regiao_atuacao?: string | null
          retirada_mensal_meses?: number | null
          retirada_mensal_valor?: number | null
          situacao?: string | null
          telefone?: string | null
          total_campanha?: number | null
          total_votos?: number | null
          updated_at?: string
        }
        Update: {
          ano_eleicao?: number | null
          assinatura?: string | null
          bairro?: string | null
          base_politica?: string | null
          cargo_disputado?: string | null
          created_at?: string
          expectativa_votos?: number | null
          fiscais_qtd?: number | null
          fiscais_valor_unit?: number | null
          id?: string
          liderancas_qtd?: number | null
          liderancas_valor_unit?: number | null
          nome?: string
          numero_urna?: string | null
          partido?: string | null
          plotagem_qtd?: number | null
          plotagem_valor_unit?: number | null
          regiao_atuacao?: string | null
          retirada_mensal_meses?: number | null
          retirada_mensal_valor?: number | null
          situacao?: string | null
          telefone?: string | null
          total_campanha?: number | null
          total_votos?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          criado_em: string | null
          email: string
          id: string
          nome_usuario: string
          user_id: string
        }
        Insert: {
          criado_em?: string | null
          email: string
          id?: string
          nome_usuario: string
          user_id: string
        }
        Update: {
          criado_em?: string | null
          email?: string
          id?: string
          nome_usuario?: string
          user_id?: string
        }
        Relationships: []
      }
      visitas: {
        Row: {
          assunto: string | null
          atualizado_em: string | null
          cadastrado_por: string | null
          criado_em: string | null
          data_hora: string | null
          descricao_assunto: string | null
          id: string
          observacoes: string | null
          origem_visita: string | null
          pessoa_id: string | null
          quem_indicou: string | null
          responsavel_tratativa: string | null
          status: string | null
        }
        Insert: {
          assunto?: string | null
          atualizado_em?: string | null
          cadastrado_por?: string | null
          criado_em?: string | null
          data_hora?: string | null
          descricao_assunto?: string | null
          id?: string
          observacoes?: string | null
          origem_visita?: string | null
          pessoa_id?: string | null
          quem_indicou?: string | null
          responsavel_tratativa?: string | null
          status?: string | null
        }
        Update: {
          assunto?: string | null
          atualizado_em?: string | null
          cadastrado_por?: string | null
          criado_em?: string | null
          data_hora?: string | null
          descricao_assunto?: string | null
          id?: string
          observacoes?: string | null
          origem_visita?: string | null
          pessoa_id?: string | null
          quem_indicou?: string | null
          responsavel_tratativa?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "recepcao"
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
      app_role: ["admin", "recepcao"],
    },
  },
} as const
