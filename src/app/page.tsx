import { getRuntimeHealth } from "@/lib/health";

export default function Home() {
  const health = getRuntimeHealth(process.env);

  return (
    <main>
      <p>Crowd-powered radio · Local demo</p>
      <h1>CrowdFM</h1>
      <p>A personal radio show, produced from one story and aired on schedule.</p>
      <small>Runtime: {health.mode}</small>
    </main>
  );
}
