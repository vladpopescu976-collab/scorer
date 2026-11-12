"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { type ActionResult, ActionError, ok, toActionError } from "@/lib/actions/result";
import {
  type AnuntInput,
  alaturaMeci,
  creeazaMeci,
  parasesteMeci,
  seteazaVizibilitate,
  stergeMeci,
} from "@/lib/meciuri";

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

export async function alaturaMeciAction(id: string): Promise<ActionResult> {
  try {
    await alaturaMeci(id, await cerePersonal());
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
