"use client";

import { useState } from "react";
import SectionTitle from "../Common/SectionTitle";

import { Brand } from "@/types/brand";
import Image from "next/image";
import brandsData from "../Brands/brandsData";

const Video = () => {
  const [isOpen, setOpen] = useState(false);

  return (
    <section className="relative z-10 py-16 md:py-20 lg:py-28">
      <div className="container">
        <SectionTitle
          title="Profesjonalne oprogramowanie"
          paragraph="Korzystam ze specjalistycznego oprogramowania do tworzenia symulacji CFD oraz projektów instalacji."
          center
          mb="80px"
        />

        <section className="pt-16">
          <div className="container">
            <div className="-mx-4 flex flex-wrap">
              <div className="w-full px-4">
                <div
                  className="wow fadeInUp flex flex-wrap items-center justify-center rounded-sm bg-gray-light px-8 py-8 dark:bg-gray-dark sm:px-10 md:px-[50px] md:py-[40px] xl:p-[50px] 2xl:px-[70px] 2xl:py-[60px]"
                  data-wow-delay=".1s"
                >
                  {brandsData.map((brand) => (
                    <SingleBrand key={brand.id} brand={brand} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-[-1] h-full w-full bg-[url(/images/video/shape.svg)] bg-cover bg-center bg-no-repeat"></div>
    </section>
  );
};

export default Video;

const SingleBrand = ({ brand }: { brand: Brand }) => {
  const { href, image, name } = brand;

  return (
    <div className="mx-3 flex w-full max-w-[180px] items-center justify-center py-[15px] sm:mx-4 lg:max-w-[150px] xl:mx-6 xl:max-w-[180px] 2xl:mx-8 2xl:max-w-[180px]">
      <a
        href={href}
        target="_blank"
        rel="nofollow noreferrer"
        className="relative h-10 w-full opacity-70  transition hover:opacity-100 hover:grayscale dark:opacity-60 dark:hover:opacity-100"
      >
        <Image src={image} alt={name} fill />
      </a>
    </div>
  );
};
