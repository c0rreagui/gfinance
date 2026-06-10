import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup static supabase instance with service/anon permissions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new NextResponse('Parâmetro userId obrigatório para assinatura do calendário.', { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all reminders (debts, subscriptions, bills) for this user
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) {
      throw error;
    }

    // Format output as standard RFC 5545 iCalendar string
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//G-Finance Hub//Calendario Financeiro EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:G-Finance - Lançamentos',
      'X-WR-TIMEZONE:America/Sao_Paulo'
    ];

    const formatICSDate = (dateStr: string) => {
      // Input example: "2026-06-01T12:00:00.000Z" or "2026-06-01"
      const date = new Date(dateStr);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      // For all-day calendar events, iCal uses VALUE=DATE:YYYYMMDD
      return `${year}${month}${day}`;
    };

    const now = new Date();
    const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    reminders?.forEach((rem: any) => {
      const isIncome = Number(rem.amount) > 0;
      const type = rem.is_recurring 
        ? (isIncome ? 'Receita Recorrente' : 'Assinatura/Despesa Recorrente') 
        : (isIncome ? 'Receita Prevista' : 'Boleto/Dívida');
      const status = rem.paid ? 'PAGO' : 'PENDENTE';
      const formattedAmount = Math.abs(Number(rem.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      
      const cleanTitle = rem.title.replace(/[,;]/g, ' ');
      const cleanDesc = `Tipo: ${type} \\nValor: ${formattedAmount} \\nStatus: ${status} \\nUrgência: ${rem.urgency || 'Normal'}`;

      // Build recurring event rules for subscriptions
      let rrule = '';
      if (rem.is_recurring) {
        const freq = rem.frequency?.toLowerCase();
        if (freq === 'primeiro_dia_util') {
          rrule = 'RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1';
        } else if (freq === 'ultimo_dia_util') {
          rrule = 'RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1';
        } else {
          rrule = 'RRULE:FREQ=MONTHLY;INTERVAL=1';
        }
      }

      const eventStart = formatICSDate(rem.due_date);

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:reminder-${rem.id}@ghub.hub`);
      icsContent.push(`DTSTAMP:${stamp}`);
      icsContent.push(`DTSTART;VALUE=DATE:${eventStart}`);
      icsContent.push(`SUMMARY:[${status}] ${cleanTitle}`);
      icsContent.push(`DESCRIPTION:${cleanDesc}`);
      if (rrule) {
        icsContent.push(rrule);
      }
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const rawContent = icsContent.join('\r\n');

    return new NextResponse(rawContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="ghub-calendar-${userId.substring(0, 8)}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Error generating calendar export:', err);
    return new NextResponse('Erro interno ao processar exportação.', { status: 500 });
  }
}
