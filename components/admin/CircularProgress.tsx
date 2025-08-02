import React from "react";

interface CircularProgressProps {
  score: number;
}

const CircularProgress = ({ score }: CircularProgressProps) => {
  const radius = 25;
  const stroke = 3;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset =
    circumference - (score / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2}>
      {/* Background circle */}
      <circle
        stroke="#e5e7eb" // Tailwind gray-200
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Progress circle */}
      <circle
        stroke="#3b82f6" // Tailwind blue-500
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference + " " + circumference}
        style={{ strokeDashoffset, transition: "stroke-dashoffset 0.35s" }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Centered Text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className="text-[10px] fill-blue-800 font-semibold cursor-pointer"
      >
        {score}%
      </text>
    </svg>
  );
};

export default CircularProgress;
