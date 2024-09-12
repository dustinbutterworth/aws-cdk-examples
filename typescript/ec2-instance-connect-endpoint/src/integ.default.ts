import {
  App, CfnOutput, Stack,
  aws_ec2 as ec2, LegacyStackSynthesizer,
} from 'aws-cdk-lib';
import { InstanceConnectEndpoint } from './endpoint';

export class IntegTesting {
  readonly stack: Stack[];
  constructor() {
    const app = new App();
    const env = { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT };
    const stack = new Stack(app, 'integ-testing-eicendpoint', { 
      env,
      synthesizer: new LegacyStackSynthesizer()
    });

    const vpc = new ec2.Vpc(stack, 'Vpc', { 
      subnetConfiguration: [
        { 
          cidrMask: 24, 
          name: 'private', 
          subnetType: ec2. SubnetType.PRIVATE_WITH_EGRESS
        },
        { 
          cidrMask: 24, 
          name: 'public', 
          subnetType: ec2. SubnetType.PUBLIC
        }
      ] 
    });

    const instance = new ec2.Instance(stack, 'instance', {
      vpc,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    });

    new CfnOutput(stack, 'InstanceId', { value: instance.instanceId });

    // allow all traffic from within VPC
    instance.connections.allowFrom(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.allTraffic());

    new InstanceConnectEndpoint(stack, 'EICEndpoint', {
      subnet: vpc.privateSubnets[0],
      vpc: vpc,
      preserveClientIp: false,
    });
    this.stack = [stack];
  }
};

new IntegTesting();
