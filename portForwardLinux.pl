use strict;
use warnings;
use v5.30.0;
use Cwd qw( abs_path getcwd );
use File::Basename qw( dirname );
# use as: dirname(abs_path());
use experimental qw( switch );
use Term::ANSIColor;

use IO::Interface::Simple;


# my $if1   = IO::Interface::Simple->new('eth0');
# my $if2   = IO::Interface::Simple->new_from_address('127.0.0.1');
# my $if3   = IO::Interface::Simple->new_from_index(1);
 
my @interfaces = IO::Interface::Simple->interfaces;

print("Looping through available interfaces...\n");


sub startPortForwarding {
    my $wifi = shift(@_);
    my $ethernet = shift(@_);

    my $file = "/proc/sys/net/ipv4/ip_forward";
    open(my $fh, '>', $file) or die "Could not open file '$file' $!";
    print $fh "1";
    close $fh;

    # Now call the iptables functions...
    
    my $cmd1 = "iptables -A FORWARD -i $ethernet -o $wifi -j ACCEPT";
    my $cmd2 = "iptables -A FORWARD -i $wifi -o $ethernet -m state --state ESTABLISHED,RELATED -j ACCEPT";
    my $cmd3 = "iptables -t nat -A POSTROUTING -o $wifi -j MASQUERADE";
    


    if (system($cmd1)) {
	die("Failed command $cmd1\n");
    };
    
    if (system($cmd2)) {
	die("Failed command $cmd2\n");
    };

    if (system($cmd3)) {
	die("Failed command $cmd3\n");
    };


    print("Successfully completed port forwarding configuration.\n");
}


my $wifi_interface;
my $ethernet_interface;

for my $if (@interfaces) {
    if ($if->is_running) {
	my $address = $if->name;
	if ($address =~ /^wl/gmi) {
	    $wifi_interface = $if;
	} elsif ($address =~ /^e/gmi) {
	    $ethernet_interface = $if;
	}	
    };

    if ($wifi_interface && $ethernet_interface) {
	print("Have wifi and ethernet interfaces...\n");
	print("Wifi: $wifi_interface\n");
	print("Ethernet: $ethernet_interface\n");
	startPortForwarding($wifi_interface->name, $ethernet_interface->name);
    } else {
	print("Unable to find both Wifi and Ethernet Interfaces.\n");
    }


 }
 

