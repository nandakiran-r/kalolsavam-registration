import { forwardRef } from "react";
import {
  COLLEGE_NAME,
  KALOLSAVAM_YEAR,
  type StudentProfile,
} from "@/lib/constants";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export const RegistrationSlip = forwardRef<
  HTMLDivElement,
  { profile: StudentProfile; generatedAt?: Date }
>(function RegistrationSlip({ profile, generatedAt = new Date() }, ref) {
  return (
    <div
      ref={ref}
      className="flex min-h-[1123px] w-[794px] flex-col bg-white px-[62px] py-[52px] text-[#111]"
      style={{ fontFamily: "var(--font-manrope), Arial, sans-serif" }}
    >
      <header>
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]">
              St. Joseph&apos;s College (Autonomous), Devagiri
            </p>
            <h1 className="mt-3 text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em]">
              KALOLSAVAM {KALOLSAVAM_YEAR}
            </h1>
            <p className="mt-1 text-[15px] font-semibold tracking-[0.04em]">
              Student Registration Form
            </p>
          </div>
          <div className="min-w-[172px] border-[1.5px] border-black px-3 py-2.5 text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em]">
              Application ID
            </p>
            <p className="mt-1 font-mono text-[17px] font-bold tracking-[0.04em]">
              {profile.applicationId}
            </p>
          </div>
        </div>
        <div className="mt-5 border-t-[2.5px] border-black" />
        <div className="mt-1 border-t border-black" />
      </header>

      <table className="mt-7 w-full border-collapse text-[12.5px] leading-snug">
        <tbody>
          <tr>
            <th className="w-[175px] border border-black bg-[#f0f0f0] px-3 py-2.5 text-left align-top text-[10px] font-bold uppercase tracking-[0.1em]">
              Full Name
            </th>
            <td className="border border-black px-3 py-2.5 align-top text-[16px] font-bold uppercase tracking-[0.01em]">
              {profile.name.toUpperCase()}
            </td>
          </tr>
          <tr>
            <th className="border border-black bg-[#f0f0f0] px-3 py-2.5 text-left align-top text-[10px] font-bold uppercase tracking-[0.1em]">
              Roll Number
            </th>
            <td className="border border-black px-3 py-2.5 align-top font-mono text-[14px] font-semibold">
              {profile.rollNumber}
            </td>
          </tr>
          <tr>
            <th className="border border-black bg-[#f0f0f0] px-3 py-2.5 text-left align-top text-[10px] font-bold uppercase tracking-[0.1em]">
              Association
            </th>
            <td className="border border-black px-3 py-2.5 align-top text-[13px]">
              {profile.associationName}
            </td>
          </tr>
          <tr>
            <th className="border border-black bg-[#f0f0f0] px-3 py-2.5 text-left align-top text-[10px] font-bold uppercase tracking-[0.1em]">
              Group Name
            </th>
            <td className="border border-black px-3 py-2.5 align-top text-[13px] font-semibold">
              House {profile.house}
            </td>
          </tr>
          <tr>
            <th className="border border-black bg-[#f0f0f0] px-3 py-2.5 text-left align-top text-[10px] font-bold uppercase tracking-[0.1em]">
              Events
            </th>
            <td className="border border-black px-3 py-2.5 align-top">
              <ol className="space-y-1.5">
                {profile.events.map((event, index) => (
                  <li key={event.id} className="flex gap-2 text-[12.5px]">
                    <span className="w-4 shrink-0 font-semibold">{index + 1}.</span>
                    <span className="break-words">
                      <span className="font-malayalam">{event.nameMl}</span>
                      <span className="text-[#444]"> / {event.nameEn}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </td>
          </tr>
        </tbody>
      </table>

      <section className="mt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
          Declaration &amp; Signatures
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-[#333]">
          This is to certify that the details above are correct and that the
          student is registered for the events listed. The form must be signed
          by the Head of the Department and the House Coordinator before the
          student participates.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-12">
          <div className="flex h-[142px] flex-col justify-end">
            <div className="border-t border-black pt-2 text-center">
              <p className="text-[11px] font-bold">Head of Department</p>
              <p className="mt-0.5 text-[9.5px] text-[#555]">Signature &amp; date</p>
            </div>
          </div>
          <div className="flex h-[142px] flex-col justify-end">
            <div className="border-t border-black pt-2 text-center">
              <p className="text-[11px] font-bold">House Coordinator</p>
              <p className="mt-0.5 text-[9.5px] text-[#555]">Signature &amp; date</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-black pt-2">
        <div className="flex items-end justify-between gap-6 text-[9px] text-[#444]">
          <p>
            Generated on{" "}
            {generatedAt.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}{" "}
            · Registered {formatDate(profile.createdAt)}
          </p>
          <p className="text-right font-semibold uppercase tracking-[0.08em]">
            {COLLEGE_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
});
