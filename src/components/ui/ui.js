import React from "react";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = cva("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",{variants:{variant:{default:"bg-primary text-primary-foreground hover:bg-primary/90",destructive:"bg-destructive text-destructive-foreground hover:bg-destructive/90",outline:"border border-input bg-background hover:bg-accent hover:text-accent-foreground",secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80",ghost:"hover:bg-accent hover:text-accent-foreground",link:"text-primary underline-offset-4 hover:underline"},size:{default:"h-10 px-4 py-2",sm:"h-9 rounded-md px-3",lg:"h-11 rounded-md px-8",icon:"h-10 w-10"}},defaultVariants:{variant:"default",size:"default"}});
export const Button = React.forwardRef(({className,variant,size,asChild=false,...props},ref)=>{const Comp=asChild?"span":"button";return(<Comp className={cn(buttonVariants({variant,size,className}))} ref={ref} {...props}/>)});
Button.displayName = "Button"

export const Input = React.forwardRef(({className,type,...props},ref)=>{return(<input type={type} className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",className)} ref={ref} {...props}/>)});
Input.displayName = "Input"

export const Textarea = React.forwardRef(({ className, ...props }, ref) => { return ( <textarea className={cn( "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50", className )} ref={ref} {...props} /> ); });
Textarea.displayName = "Textarea"

export const Card = React.forwardRef(({ className, ...props }, ref) => ( <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props} /> ));
Card.displayName = "Card"
export const CardHeader = React.forwardRef(({ className, ...props }, ref) => ( <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} /> ));
CardHeader.displayName = "CardHeader"
export const CardTitle = React.forwardRef(({ className, ...props }, ref) => ( <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} /> ));
CardTitle.displayName = "CardTitle"
export const CardContent = React.forwardRef(({ className, ...props }, ref) => ( <div ref={ref} className={cn("p-6 pt-0", className)} {...props} /> ));
CardContent.displayName = "CardContent"
export const CardFooter = React.forwardRef(({ className, ...props }, ref) => ( <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} /> ));
CardFooter.displayName = "CardFooter"
