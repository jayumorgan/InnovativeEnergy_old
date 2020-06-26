function ssh_deploy(){
	scp -r deploy/ debian@192.168.0.3:/var/lib/cloud9/vention-control/machineMotion
}
