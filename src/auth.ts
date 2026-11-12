import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { appleActiv, autentificaSocial, googleActiv } from "@/lib/social";
import { loginSchema } from "@/lib/validations/auth";
import { inregistreazaEsec, ipDinCerere, stergeEsecurile, verificaLimitarea } from "@/lib/limitare";

/**
 * `authorize` nu poate trimite un mesaj propriu spre interfață — orice `null`
 * ajunge la aceeași eroare generică. O eroare de tipul acesta pune însă un
 * `code` în adresa de redirectare, iar pagina de autentificare îl citește ca
 * să explice exact ce s-a întâmplat.
 */
class EmailNeconfirmat extends CredentialsSignin {
  code = "email_neconfirmat";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/autentificare",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parolă", type: "password" },
        // Tipul de cont ales in interfata. Daca e trimis, contul trebuie sa
        // corespunda — altfel autentificarea de pe tabul "Cont Personal" cu
        // datele unui cont Business te-ar duce in panoul Business.
        expectedRole: { label: "Tip cont", type: "text" },
      },
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Fără limitare, cineva poate încerca parole la nesfârșit.
        const ip = ipDinCerere(request);
        const limitare = await verificaLimitarea(parsed.data.email, ip);
        if (!limitare.permis) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) {
          await inregistreazaEsec(parsed.data.email, ip);
          return null;
        }

        const passwordValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!passwordValid) {
          await inregistreazaEsec(parsed.data.email, ip);
          return null;
        }

        // Contul exista, parola e buna, dar adresa nu a fost confirmata.
        // Verificam dupa parola, ca sa nu se poata afla din afara care adrese
        // au cont neconfirmat.
        if (!user.emailVerified) {
          throw new EmailNeconfirmat();
        }

        const expectedRole = credentials?.expectedRole;
        if (
          (expectedRole === "PERSONAL" || expectedRole === "BUSINESS") &&
          user.role !== expectedRole
        ) {
          return null;
        }

        await stergeEsecurile(parsed.data.email, ip);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    // Apar doar când sunt configurate cheile; fără ele butoanele nu se afișează.
    ...(googleActiv() ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })] : []),
    ...(appleActiv() ? [Apple({ clientId: process.env.AUTH_APPLE_ID, clientSecret: process.env.AUTH_APPLE_SECRET })] : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.type === "credentials") return true;

      // Tipul de cont ales înainte de a pleca la furnizor, ținut într-un cookie.
      const tip = (await cookies()).get("scorer_tip")?.value;
      const rezultat = await autentificaSocial({
        email: user.email,
        emailConfirmat:
          account.provider === "apple"
            ? true // Apple trimite doar adrese verificate
            : (profile as { email_verified?: boolean } | undefined)?.email_verified === true,
        nume: user.name,
        rol: tip === "business" ? "BUSINESS" : "PERSONAL",
      });
      if (!rezultat.ok) return false;

      user.id = rezultat.id;
      user.role = rezultat.rol;
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      // După schimbarea emailului sau a pozei din „Contul meu”, pagina cere o
      // actualizare a sesiunii, ca peste tot să apară datele noi. La
      // autentificare citim și poza, ca iconița din bară să apară imediat.
      if ((trigger === "update" || user) && token.id) {
        const actual = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { email: true, name: true, image: true },
        });
        if (actual) {
          token.email = actual.email;
          token.name = actual.name;
          token.picture = actual.image;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.image = (token.picture as string | null | undefined) ?? null;
      }
      return session;
    },
  },
});
