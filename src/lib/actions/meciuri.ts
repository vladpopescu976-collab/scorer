"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { type ActionResult, ActionError, ok, toActionError } from "@/lib/actions/result";
import {
  type AnuntInput,
  alaturaMeci,
  creeazaMeci,
  parasesteMeci,
  scoateJucator,
  seteazaVizibilitate,
  stergeMeci,
} from "@/lib/meciuri";
import {
  type AnuntJucatorInput,
  invitaJucator,
  seteazaInvitatii,
  salveazaAnuntJucator,
  stergeAnuntJucator,
} from "@/lib/jucatori-liberi";

async function cerePersonal() {
  const sesiune = await auth();
  if (!sesiune?.user?.id) throw new ActionError("Conectează-te ca să continui.");
  if (sesiune.user.role !== "PERSONAL") throw new ActionError("Este nevoie de un cont Personal.");
  return sesiune.user.id;
}

export async function posteazaMeci(input: AnuntInput): Promise<ActionResult> {
  try {
    await creeazaMeci(await cerePersonal(), input);
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("posteazaMeci", error);
  }
}

export async function alaturaMeciAction(id: string, telefon?: string): Promise<ActionResult> {
  try {
    await alaturaMeci(id, await cerePersonal(), telefon);
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("alaturaMeci", error);
  }
}

export async function parasesteMeciAction(id: string): Promise<ActionResult> {
  try {
    await parasesteMeci(id, await cerePersonal());
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("parasesteMeci", error);
  }
}

export async function stergeMeciAction(id: string): Promise<ActionResult> {
  try {
    await stergeMeci(id, await cerePersonal());
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("stergeMeci", error);
  }
}

export async function seteazaVizibilitateAction(vizibil: boolean): Promise<ActionResult> {
  try {
    await seteazaVizibilitate(await cerePersonal(), vizibil);
    revalidatePath("/gaseste-meci/jucatori");
    return ok();
  } catch (error) {
    return toActionError("seteazaVizibilitate", error);
  }
}

export async function salveazaAnuntJucatorAction(input: AnuntJucatorInput): Promise<ActionResult> {
  try {
    await salveazaAnuntJucator(await cerePersonal(), input);
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("salveazaAnuntJucator", error);
  }
}

export async function stergeAnuntJucatorAction(id: string): Promise<ActionResult> {
  try {
    await stergeAnuntJucator(id, await cerePersonal());
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("stergeAnuntJucator", error);
  }
}

export async function invitaJucatorAction(id: string, mesaj?: string): Promise<ActionResult> {
  try {
    await invitaJucator(id, await cerePersonal(), mesaj);
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("invitaJucator", error);
  }
}

export async function seteazaInvitatiiAction(id: string, deschis: boolean): Promise<ActionResult> {
  try {
    await seteazaInvitatii(id, await cerePersonal(), deschis);
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("seteazaInvitatii", error);
  }
}

export async function scoateJucatorAction(id: string, jucatorId: string): Promise<ActionResult> {
  try {
    await scoateJucator(id, await cerePersonal(), jucatorId);
    revalidatePath("/gaseste-meci");
    return ok();
  } catch (error) {
    return toActionError("scoateJucator", error);
  }
}
