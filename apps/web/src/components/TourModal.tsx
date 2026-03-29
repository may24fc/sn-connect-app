'use client';

import { Button } from '@hr-portal/ui';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ModalTourStep {
  title: string;
  description: string;
  imageUrl?: string; // Screenshot/video URL
  videoUrl?: string; // Video URL (optional, can play inline)
}

export interface ModalTourProps {
  isOpen: boolean;
  steps: ModalTourStep[];
  onClose: () => void;
  tourName: string;
}

export function TourModal({ isOpen, steps, onClose, tourName }: ModalTourProps) {
  if (steps.length === 0) return null;

  const [currentStep, setCurrentStep] = useState(0);
  const safeStepIndex = Math.min(Math.max(currentStep, 0), steps.length - 1);
  const step = steps[safeStepIndex]!;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen, tourName]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2">
        <div className="bg-white shadow-2xl rounded-lg overflow-hidden dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{step.title}</h2>
              <p className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mt-1">
                {tourName.replace('-', ' ')}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              aria-label="Close tour"
            >
              <X className="h-5 w-5 text-zinc-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-96 overflow-y-auto">
            {/* Image or Video */}
            {step.videoUrl ? (
              <video
                src={step.videoUrl}
                className="w-full h-64 object-cover rounded-lg mb-4 bg-zinc-100 dark:bg-zinc-800"
                controls
              />
            ) : step.imageUrl ? (
              <img
                src={step.imageUrl}
                alt={step.title}
                className="w-full h-64 object-cover rounded-lg mb-4 bg-zinc-100 dark:bg-zinc-800"
              />
            ) : (
              <div className="w-full h-64 rounded-lg mb-4 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-900/20 flex items-center justify-center">
                <p className="text-zinc-400 text-sm">Screenshot placeholder</p>
              </div>
            )}

            {/* Description */}
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{step.description}</p>
          </div>

          {/* Footer - Progress indicator */}
          <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex gap-1 mb-4">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    idx === currentStep
                      ? 'bg-indigo-600 dark:bg-indigo-500'
                      : idx < currentStep
                        ? 'bg-indigo-200 dark:bg-indigo-900'
                        : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={handleSkip}>
                Skip
              </Button>

              {!isFirstStep && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  Previous
                </Button>
              )}

              {!isLastStep ? (
                <Button size="sm" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button size="sm" onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                  Finish
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
