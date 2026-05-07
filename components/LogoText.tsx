import React from 'react';

interface LogoTextProps {
  className?: string;       // Outer specific classes (e.g. text sizes for desktop vs mobile)
  myClassName?: string;     // Specific classes for the "My" part
}

export default function LogoText({ 
  className = "text-[24px] tracking-[1px] leading-none font-bold", 
  myClassName = "text-[18px] font-medium tracking-[1px] mr-0.5" 
}: LogoTextProps) {
  return (
    <span className={`font-exo-2 inline-block ${className}`}>
      <span className={`text-silver-hi ${myClassName}`}>My</span>
      <span className="bg-gradient-to-br from-[#60B8FF] to-b1 bg-clip-text text-transparent">AI</span>
      <span className="text-silver-mid">ron</span>
      <span className="text-silver-mid">Coa</span>
      <span className="bg-gradient-to-br from-b3 to-[#0088FF] bg-clip-text text-transparent">ch</span>
    </span>
  );
}
