import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

// Labeled text inputs. The label, hint and error are wired to the control
// with htmlFor / aria-describedby / aria-invalid, so every field has an
// accessible name and its messages are announced. Styling: .ui-field* and
// .ui-input in global.css.

function FieldShell({ id, label, hint, error, className, children }) {
  return (
    <div className={cn('ui-field', className)}>
      {label && <label className="ui-field__label" htmlFor={id}>{label}</label>}
      {children}
      {error
        ? <p id={`${id}-error`} className="ui-field__error" role="alert">{error}</p>
        : hint && <p id={`${id}-hint`} className="ui-field__hint">{hint}</p>}
    </div>
  );
}

function describedBy(id, hint, error) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export const Input = forwardRef(function Input(
  { label, hint, error, id: idProp, className, inputClassName, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input
        ref={ref}
        id={id}
        className={cn('ui-input', inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, id: idProp, className, inputClassName, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        ref={ref}
        id={id}
        className={cn('ui-input', inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
});
