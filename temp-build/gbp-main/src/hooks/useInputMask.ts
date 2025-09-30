import { ChangeEvent, useState } from 'react';

type MaskFunction = (value: string) => string;

const createMaskFunction = (mask: string): MaskFunction => {
  return (value: string) => {
    let result = '';
    let valueIndex = 0;
    
    for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
      const maskChar = mask[i];
      const valueChar = value[valueIndex];

      if (maskChar === '9') {
        if (/\d/.test(valueChar)) {
          result += valueChar;
          valueIndex++;
        }
      } else if (maskChar === 'a') {
        if (/[a-zA-Z]/.test(valueChar)) {
          result += valueChar;
          valueIndex++;
        }
      } else if (maskChar === '*') {
        result += valueChar;
        valueIndex++;
      } else {
        result += maskChar;
        if (valueChar === maskChar) {
          valueIndex++;
        }
      }
    }

    return result;
  };
}

export function useInputMask(initialValue: string = '', mask?: string) {
  const [value, setValue] = useState(initialValue);
  
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!mask) {
      setValue(newValue);
      return;
    }

    const maskFunction = createMaskFunction(mask);
    const maskedValue = maskFunction(newValue.replace(/[^a-zA-Z0-9]/g, ''));
    setValue(maskedValue);
    
    // Update the input value to show the mask
    e.target.value = maskedValue;
  };

  return {
    value,
    onChange: handleChange,
  };
}