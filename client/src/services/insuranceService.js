const BASE_URL = import.meta.env.VITE_BACK_END_SERVER_URL;

export const downloadInsuranceCardPdf = async (babyId) => {
  const token = localStorage.getItem("token");

  console.log("--> Pokušaj preuzimanja PDF-a za babyId:", babyId);
  console.log("--> Puna URL adresa:", `${BASE_URL}/insurance-records/babies/${babyId}/insurance-card/pdf`);

  const res = await fetch(`${BASE_URL}/insurance-records/babies/${babyId}/insurance-card/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.err || "Failed to download insurance card PDF.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
};