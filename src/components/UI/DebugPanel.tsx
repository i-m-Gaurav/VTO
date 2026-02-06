import { useDebugStore } from '../../stores/debugStore';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

function Slider({ label, value, onChange, min, max, step = 1, unit = '' }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/80">{label}</span>
        <span className="text-xs text-white font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
          [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
          hover:[&::-webkit-slider-thumb]:bg-blue-400"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 pt-2 mt-2">
      <h4 className="text-xs font-semibold text-blue-400 mb-2">{title}</h4>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

export function DebugPanel() {
  const store = useDebugStore();
  const { setValue, resetAll } = store;

  return (
    <div className="absolute top-4 right-4 w-72 max-h-[90vh] overflow-y-auto bg-black/80 backdrop-blur-lg rounded-xl p-4 z-50 shadow-2xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-bold text-sm">🎛️ Debug Controls</h3>
        <button
          onClick={resetAll}
          className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 text-white rounded transition"
        >
          Reset All
        </button>
      </div>

      {/* Toggles */}
      <div className="flex gap-2 mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={store.enableTracking}
            onChange={(e) => setValue('enableTracking', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-xs text-white">Tracking</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={store.useManualRotations}
            onChange={(e) => setValue('useManualRotations', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-xs text-white">Manual Mode</span>
        </label>
      </div>

      {/* Body Controls */}
      <Section title="Body">
        <Slider
          label="Body Y Rotation"
          value={store.bodyRotationY}
          onChange={(v) => setValue('bodyRotationY', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
      </Section>

      {/* Reference Angles */}
      <Section title="Reference Angles">
        <Slider
          label="Arms Down Angle"
          value={store.armsDownAngle}
          onChange={(v) => setValue('armsDownAngle', v)}
          min={-120}
          max={-30}
          step={1}
          unit="°"
        />
      </Section>

      {/* Multipliers */}
      <Section title="Multipliers">
        <Slider
          label="Smoothing"
          value={store.smoothingFactor}
          onChange={(v) => setValue('smoothingFactor', v)}
          min={0.1}
          max={1.0}
          step={0.05}
        />
        <Slider
          label="Rotation Multiplier"
          value={store.rotationMultiplier}
          onChange={(v) => setValue('rotationMultiplier', v)}
          min={0.1}
          max={2.0}
          step={0.1}
        />
        <Slider
          label="Forearm Multiplier"
          value={store.forearmMultiplier}
          onChange={(v) => setValue('forearmMultiplier', v)}
          min={0.1}
          max={1.5}
          step={0.1}
        />
      </Section>

      {/* Left Upper Arm */}
      <Section title="Left Upper Arm">
        <Slider
          label="X Rotation"
          value={store.leftUpperArmX}
          onChange={(v) => setValue('leftUpperArmX', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <Slider
          label="Y Rotation"
          value={store.leftUpperArmY}
          onChange={(v) => setValue('leftUpperArmY', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <Slider
          label="Z Rotation"
          value={store.leftUpperArmZ}
          onChange={(v) => setValue('leftUpperArmZ', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
      </Section>

      {/* Left Lower Arm */}
      <Section title="Left Lower Arm">
        <Slider
          label="X Rotation"
          value={store.leftLowerArmX}
          onChange={(v) => setValue('leftLowerArmX', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <Slider
          label="Y Rotation"
          value={store.leftLowerArmY}
          onChange={(v) => setValue('leftLowerArmY', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <Slider
          label="Z Rotation"
          value={store.leftLowerArmZ}
          onChange={(v) => setValue('leftLowerArmZ', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
      </Section>

      {/* Right Upper Arm */}
      <Section title="Right Upper Arm">
        <Slider
          label="X Rotation"
          value={store.rightUpperArmX}
          onChange={(v) => setValue('rightUpperArmX', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <Slider
          label="Y Rotation"
          value={store.rightUpperArmY}
          onChange={(v) => setValue('rightUpperArmY', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <Slider
          label="Z Rotation"
          value={store.rightUpperArmZ}
          onChange={(v) => setValue('rightUpperArmZ', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
      </Section>

      {/* Right Lower Arm */}
      <Section title="Right Lower Arm">
        <Slider
          label="X Rotation"
          value={store.rightLowerArmX}
          onChange={(v) => setValue('rightLowerArmX', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <Slider
          label="Y Rotation"
          value={store.rightLowerArmY}
          onChange={(v) => setValue('rightLowerArmY', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <Slider
          label="Z Rotation"
          value={store.rightLowerArmZ}
          onChange={(v) => setValue('rightLowerArmZ', v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
      </Section>

      {/* Info */}
      <div className="mt-3 pt-2 border-t border-white/10">
        <p className="text-[10px] text-white/50">
          Use "Manual Mode" to directly control bone rotations with sliders.
          Disable tracking to test static poses.
        </p>
      </div>
    </div>
  );
}
