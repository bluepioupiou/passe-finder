<div class="view">

	<b><?php echo CHtml::encode($data->getAttributeLabel('name')); ?>:</b>
	<?php echo CHtml::link(CHtml::encode($data->name), array('lesson/view', 'id'=>$data->id)); ?>
	<br />
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('school_id')); ?>:</b>
	<?php echo CHtml::link(CHtml::encode($data->school->name), array('school/view', 'id'=>$data->school->id)); ?>
	<br />
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('danse_id')); ?>:</b>
	<?php echo CHtml::encode($data->danse->name); ?>
	<br />	

	<b><?php echo CHtml::encode($data->getAttributeLabel('description')); ?>:</b>
	<?php echo CHtml::encode($data->description); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('time')); ?>:</b>
	<?php echo CHtml::encode($data->time); ?>
	<br />
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('private')); ?>:</b>
	<?php 
		if ($data->private){
			echo "Oui";
		}
		else {
			echo "Non";
		}
	?>
	<br />
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('open')); ?>:</b>
	<?php 
		if ($data->openInscription){
			echo "Oui";
		}
		else {
			echo "Non";
		}
	?>
	<br />
	


</div>