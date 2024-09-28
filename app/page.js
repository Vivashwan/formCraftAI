import { Button } from "@/components/ui/button";
import Image from "next/image";
import Hero from "./_components/Hero";

export default function Home() {
  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-32 lg:flex lg:h-screen">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-extrabold sm:text-5xl">
            Create Stunning Forms
            <strong className="font-extrabold text-red-700 sm:block">
              {" "}
              Using AI.{" "}
            </strong>
          </h1>

          <p className="mt-4 sm:text-xl/relaxed">
            Simplify Form Creation with Intelligent AI Solutions. Boost your
            productivity by letting AI handle the complexities, so you can focus
            on what matters most.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              className="block w-full rounded bg-red-600 px-12 py-3 text-sm font-medium text-white shadow hover:bg-red-700 focus:outline-none focus:ring active:bg-red-500 sm:w-auto"
              href="/dashboard"
            >
              Let's Create
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
