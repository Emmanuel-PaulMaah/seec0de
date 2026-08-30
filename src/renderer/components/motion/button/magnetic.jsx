"use client";;
import { forwardRef } from "react";
import { Magnetic } from "../magnetic";
import { Button } from "./base";

export const MagneticButton = forwardRef(function MagneticButton(
  { strength = 0.25, magneticClassName, children, ...rest },
  ref,
) {
  return (
    <Magnetic strength={strength} className={magneticClassName}>
      <Button ref={ref} {...rest}>
        {children}
      </Button>
    </Magnetic>
  );
});
