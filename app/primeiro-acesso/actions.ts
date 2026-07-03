'use server';

import prisma from '../../lib/prisma';
import { getSession } from '../../lib/tenant';
import { hashPassword } from 'better-auth/crypto';

export async function changeFirstPasswordAction(
  passwordRaw: string,
  confirmPasswordRaw: string
) {
  const session = await getSession();
  if (!session) {
    throw new Error('Não autorizado: Sessão não encontrada.');
  }

  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mustChangePassword: true, email: true },
    });

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    if (!user.mustChangePassword) {
      throw new Error('A alteração de senha inicial não é exigida para sua conta.');
    }

    if (!passwordRaw || passwordRaw.length < 6) {
      throw new Error('A nova senha deve conter no mínimo 6 caracteres.');
    }

    if (passwordRaw !== confirmPasswordRaw) {
      throw new Error('A nova senha e a confirmação de senha não coincidem.');
    }

    const hashedPassword = await hashPassword(passwordRaw);

    await prisma.$transaction(async (tx) => {
      // 1. Update the password hash in the Account table
      await tx.account.updateMany({
        where: {
          userId,
          providerId: 'credential',
        },
        data: {
          password: hashedPassword,
        },
      });

      // 2. Set mustChangePassword to false and update passwordChangedAt timestamp
      await tx.user.update({
        where: { id: userId },
        data: {
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        },
      });

      // 3. Find active organization associated with user
      const firstMembership = await tx.member.findFirst({
        where: { userId },
      });

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          action: 'USER_FIRST_PASSWORD_CHANGED',
          target: userId,
          organizationId: firstMembership?.organizationId || 'admin_org_system_fallback',
          userId,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error in changeFirstPasswordAction:', error);
    const message = error instanceof Error ? error.message : 'Erro ao alterar a senha.';
    throw new Error(message);
  }
}

export async function checkMustChangePasswordAction() {
  const session = await getSession();
  if (!session) return { mustChange: false };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true }
  });

  return { mustChange: !!user?.mustChangePassword };
}
