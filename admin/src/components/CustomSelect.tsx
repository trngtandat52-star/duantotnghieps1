'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Chọn một tùy chọn...',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Nút bấm hiển thị lựa chọn */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
          isOpen
            ? 'bg-[#fffdfa] border-[#d6a963] ring-2 ring-[#d6a963]/20 shadow-sm'
            : 'bg-[#fffdfa] border-[#eedfca] hover:border-[#d6a963] text-[#2b251f]'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
      >
        <span className={`truncate text-left ${selectedOption ? 'text-[#2b251f] font-semibold' : 'text-[#a4998f]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icons.ChevronDown
          className={`w-4 h-4 text-[#72675f] transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-[#d6a963]' : ''
          }`}
        />
      </button>

      {/* Menu thả xuống tuỳ chỉnh sang trọng */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 w-full z-50 bg-[#fffdfa] border border-[#eedfca] rounded-2xl shadow-xl shadow-[#2b251f]/10 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-h-60 overflow-y-auto divide-y divide-[#f7efe5]/50">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#fbf7f1] text-[#b58636] font-bold'
                      : 'text-[#2b251f] hover:bg-[#fbf7f1] hover:text-[#b58636]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Icons.Check className="w-3.5 h-3.5 text-[#d6a963] shrink-0 ml-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
