import React from "react";
import { Icon, useStyleConfig } from "@chakra-ui/react";

const Share = (props: any) => {
  const { variant, size, ...rest } = props;
  const styles = useStyleConfig("Icon", { variant, size });

  return (
    <Icon
      width="10"
      height="12"
      viewBox="0 0 10 12"
      fill="currentColor"
      __css={styles}
      {...rest}
    >
      <path d="M3.8896 2.37124L4.47849 1.78235L4.47837 6.78362C4.47837 7.07074 4.71217 7.30454 5.00026 7.30454C5.29031 7.30454 5.52215 7.07123 5.52215 6.78362L5.52214 1.78386L6.1097 2.37125C6.30877 2.57032 6.64039 2.57178 6.84435 2.36782C7.04929 2.16289 7.04929 1.83567 6.84728 1.63366L5.36526 0.151135C5.26598 0.0518463 5.1344 0.00195645 5.00185 0.00195645L4.99794 0C4.86589 0.000488332 4.73431 0.0508642 4.63404 0.151133L3.15152 1.63366C2.95245 1.83273 2.95098 2.16435 3.15494 2.36782C3.35988 2.57325 3.68759 2.57325 3.8896 2.37124Z" />
      <path d="M2.90277 3.65225H1.34552C0.770331 3.65225 0.304688 4.1179 0.304688 4.6926V10.9597C0.304688 11.5334 0.770819 12 1.34552 12H8.65485C9.23004 12 9.69569 11.5339 9.69569 10.9597V4.6926C9.69569 4.11887 9.22955 3.65225 8.65485 3.65225H7.09787V4.69563H8.65251V10.9563H1.34807V4.69563H2.90277V3.65225Z" />
    </Icon>
  );
};

export default Share;