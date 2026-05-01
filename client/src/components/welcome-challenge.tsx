// SAFE CHALLENGE DISPLAY
import React from "react";

export default function WelcomeChallenge({ challenge }: any) {
  if (!challenge) return null;

  const name = challenge?.name ?? "Challenge";
  const desc = challenge?.description ?? "";

  return (
    <div>
      <h3>{name}</h3>
      <p>{desc}</p>
    </div>
  );
}
