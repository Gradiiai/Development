'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/shared/input';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Separator } from '@/components/ui/shared/separator';
import { Label } from '@/components/ui/shared/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/shared/checkbox';
import { Slider } from '@/components/ui/slider';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  SlidersHorizontal,
  Calendar,
  Hash,
  Tag,
  Users,
  Star,
  Clock,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  color?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'checkbox' | 'range' | 'date-range' | 'number';
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  icon?: React.ReactNode;
}

export interface SearchFilterProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  activeFilters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  showFilterCount?: boolean;
  showClearAll?: boolean;
  className?: string;
  compact?: boolean;
  debounceMs?: number;
}

export function SearchFilter({
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filters = [],
  activeFilters = {},
  onFiltersChange,
  showFilterCount = true,
  showClearAll = true,
  className,
  compact = false,
  debounceMs = 300
}: SearchFilterProps) {
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(activeFilters);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && localSearchValue !== searchValue) {
        onSearchChange(localSearchValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localSearchValue, debounceMs, onSearchChange, searchValue]);

  // Sync external search value changes
  useEffect(() => {
    if (searchValue !== localSearchValue) {
      setLocalSearchValue(searchValue);
    }
  }, [searchValue]);

  // Sync external filter changes
  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    
    // Remove empty values and "all" values (which represent no filter)
    if (value === undefined || value === null || value === '' || value === 'all' ||
        (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key];
    }
    
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [localFilters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setLocalFilters({});
    setLocalSearchValue('');
    onFiltersChange?.({});
    onSearchChange?.('');
  }, [onFiltersChange, onSearchChange]);

  const activeFilterCount = useMemo(() => {
    return Object.keys(localFilters).filter(key => {
      const value = localFilters[key];
      return value !== undefined && value !== null && value !== '' && value !== 'all' &&
             (!Array.isArray(value) || value.length > 0);
    }).length;
  }, [localFilters]);

  const renderFilter = (filter: FilterConfig) => {
    const value = localFilters[filter.key];

    switch (filter.type) {
      case 'select':
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              {filter.icon}
              {filter.label}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(newValue) => handleFilterChange(filter.key, newValue)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label}</SelectItem>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {option.count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              {filter.icon}
              {filter.label}
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filter.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${filter.key}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter(v => v !== option.value);
                      handleFilterChange(filter.key, newValues);
                    }}
                  />
                  <Label 
                    htmlFor={`${filter.key}-${option.value}`}
                    className="text-sm flex items-center justify-between w-full cursor-pointer"
                  >
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {option.count}
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'range':
        const rangeValue = Array.isArray(value) ? value : [filter.min || 0, filter.max || 100];
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              {filter.icon}
              {filter.label}
            </Label>
            <div className="px-2">
              <Slider
                value={rangeValue}
                onValueChange={(newValue) => handleFilterChange(filter.key, newValue)}
                min={filter.min || 0}
                max={filter.max || 100}
                step={filter.step || 1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{rangeValue[0]}</span>
                <span>{rangeValue[1]}</span>
              </div>
            </div>
          </div>
        );

      case 'date-range':
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              {filter.icon}
              {filter.label}
            </Label>
            <DatePickerWithRange
              date={value}
              onDateChange={(newValue) => handleFilterChange(filter.key, newValue)}
              placeholder={filter.placeholder}
            />
          </div>
        );

      case 'number':
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              {filter.icon}
              {filter.label}
            </Label>
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value ? Number(e.target.value) : undefined)}
              placeholder={filter.placeholder}
              min={filter.min}
              max={filter.max}
              step={filter.step}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderActiveFilters = () => {
    const activeKeys = Object.keys(localFilters).filter(key => {
      const value = localFilters[key];
      return value !== undefined && value !== null && value !== '' && value !== 'all' &&
             (!Array.isArray(value) || value.length > 0);
    });

    if (activeKeys.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {activeKeys.map(key => {
          const filter = filters.find(f => f.key === key);
          const value = localFilters[key];
          
          if (!filter) return null;

          let displayValue: string;
          if (Array.isArray(value)) {
            if (filter.type === 'multiselect') {
              displayValue = value.map(v => 
                filter.options?.find(opt => opt.value === v)?.label || v
              ).join(', ');
            } else if (filter.type === 'range') {
              displayValue = `${value[0]} - ${value[1]}`;
            } else {
              displayValue = value.join(', ');
            }
          } else if (filter.type === 'select') {
            displayValue = filter.options?.find(opt => opt.value === value)?.label || value;
          } else {
            displayValue = value != null ? String(value) : '';
          }

          return (
            <Badge key={key} variant="secondary" className="flex items-center gap-1">
              {filter.icon}
              <span className="text-xs">
                {filter.label}: {displayValue}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent"
                onClick={() => handleFilterChange(key, undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={localSearchValue}
              onChange={(e) => setLocalSearchValue(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {filters.length > 0 && (
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {showClearAll && activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-auto p-1 text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filters.map(renderFilter)}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        
        {renderActiveFilters()}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          {showClearAll && (activeFilterCount > 0 || localSearchValue) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={localSearchValue}
            onChange={(e) => setLocalSearchValue(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        {filters.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filters.map(renderFilter)}
            </div>
          </>
        )}

        {/* Active Filters */}
        {renderActiveFilters()}
        
        {/* Filter Summary */}
        {showFilterCount && activeFilterCount > 0 && (
          <div className="text-sm text-muted-foreground">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for managing search and filter state
export function useSearchFilter(initialFilters: Record<string, any> = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters);

  const clearAll = useCallback(() => {
    setSearchTerm('');
    setFilters({});
  }, []);

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value === undefined || value === null || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    updateFilter,
    clearAll,
    hasActiveFilters: Object.keys(filters).length > 0 || searchTerm.length > 0
  };
}