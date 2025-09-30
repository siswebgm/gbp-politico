import { supabaseClient } from '../lib/supabase';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface SendInviteParams {
  email: string;
  invite_link: string;
}

export const emailService = {
  async sendEmail({ to, subject, html }: SendEmailParams) {
    try {
      // Por enquanto, vamos apenas simular o envio do email
      // e retornar sucesso para testar o fluxo
      console.log('Email would be sent to:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Erro ao enviar email de convite');
    }
  },

  async sendInvite({ email, invite_link }: SendInviteParams) {
    const { subject, html } = this.getInviteEmailTemplate(email, invite_link);
    return this.sendEmail({
      to: email,
      subject,
      html
    });
  },

  getInviteEmailTemplate(email: string, inviteLink: string) {
    return {
      subject: 'Convite para cadastro no sistema',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Bem-vindo ao Sistema!</h2>
          
          <p>Você foi convidado para se cadastrar em nossa plataforma.</p>
          
          <p>Para completar seu cadastro, clique no botão abaixo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" 
               style="background-color: #2563eb; 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px;
                      display: inline-block;">
              Completar Cadastro
            </a>
          </div>
          
          <p>Ou copie e cole o link abaixo no seu navegador:</p>
          <p style="background-color: #f3f4f6; 
                    padding: 12px; 
                    border-radius: 4px; 
                    word-break: break-all;">
            ${inviteLink}
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Este link é válido por 7 dias. Se você não solicitou este convite, por favor ignore este email.
          </p>
        </div>
      `
    };
  }
};
