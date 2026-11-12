import { eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import { cautaJucatori } from "@/lib/meciuri";

export const maxDuration = 60;

/** Jucătorii care au ales să apară în căutare. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return raspuns(
      await cautaJucatori({
        oras: url.searchParams.get("oras"),
        nume: url.searchParams.get("nume"),
        sport: url.searchParams.get("sport"),
      })
    );
  } catch (error) {
    return eroareNeasteptata("jucatori", error);
  }
}
