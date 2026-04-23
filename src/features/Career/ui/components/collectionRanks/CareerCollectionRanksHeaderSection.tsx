import React from "react";

import CareerSectionHeader from "../primitives/CareerSectionHeader";

const CareerCollectionRanksHeaderSection: React.FC = () => {
  return (
    <CareerSectionHeader
      title="題庫戰績"
      description="這裡看的是題庫榜單位置與近期變動，不是單場結算名次。"
      badge="LEADERBOARD VIEW"
    />
  );
};

export default CareerCollectionRanksHeaderSection;
