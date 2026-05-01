// SAFE HOME WRAPPER
import React from "react";

export default function Home({ data }: any) {
  if (!data) return <div />;

  return <div>{/* existing home content */}</div>;
}
