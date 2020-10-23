<div class="view">

	<b><?php echo CHtml::encode($data->getAttributeLabel('name')); ?>:</b>
	<h3><?php echo CHtml::link(CHtml::encode($data->name), array('view', 'id'=>$data->id)); ?></h3>
	<br />
	
	<b>Nombre de cours:</b>
	<?php CHtml::encode($data->lessonsCount); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('adress')); ?>:</b>
	<?php echo CHtml::encode($data->adress); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('postal_code')); ?>:</b>
	<?php echo CHtml::encode($data->postal_code); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('city')); ?>:</b>
	<?php echo CHtml::encode($data->city); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('url')); ?>:</b>
	<a href="<?php echo CHtml::encode($data->url); ?>" target="_blank">Lien externe</a>
	<br />
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('lessonsCount')); ?>:</b>
	<?php echo CHtml::encode($data->lessonsCount); ?>
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


</div>