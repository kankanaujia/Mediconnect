export const metadata = { title: "Offline | MediConnect" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 pt-28 text-center">
      <h1 className="font-serif text-3xl font-bold text-gray-800">You are offline</h1>
      <p className="mt-4 text-gray-500">
        MediConnect needs the internet to show doctors and your appointments. Check your connection and try
        again.
      </p>
      <p className="mt-2 text-gray-500">आप ऑफ़लाइन हैं। इंटरनेट चालू करके फिर से कोशिश करें।</p>
    </div>
  );
}
