import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface HopeTherapeuticStackProps extends cdk.StackProps {
    domainName?: string;
    certificateArn?: string;
}
export declare class HopeTherapeuticStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: HopeTherapeuticStackProps);
}
